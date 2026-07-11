# Offline / GPS Sync — Implementation Report

**Date:** 2026-07-11  
**Repos:** Mobile `d:\agri-clinic-mobile` · Backend `d:\agri_clinic`  
**Phase:** Production-safe offline field workflow (P0 + core P1)

---

## 1. Executive summary

Implemented the critical data-safety layer for Kavya Agri Clinic offline field work:

- **GPS queue preservation** across workday teardown, end workday, and duty mismatch
- **Item-level GPS bulk acknowledgement** (HTTP 207 / `accepted_ids` + `failed_items`)
- **User-scoped offline queues** with orphan quarantine (no cross-user sync)
- **Logout blocking** when pending field data exists
- **Durable visit photo storage** in app document directory
- **Photo upload idempotency** via `client_upload_id` (backend unique constraint)
- **Offline-safe end workday** via local operation queue
- **Ordered single-flight sync** (visits → photos → GPS → workday end)
- **Sync Center UX** with extended pending counts and en/ta copy

**Offline Start Workday:** Not implemented (per V1.0 decision).

**Final verdict:** **Ready for internal offline QA** — pending physical-device execution of `OFFLINE_GPS_SYNC_DEVICE_QA_PLAN.md`. Not production-ready until device QA, release-build validation, and backend deployment with migration pass.

---

## 2. Files changed

### Mobile (primary)

| Area | Files |
|------|-------|
| GPS safety | `src/storage/TrackingContext.tsx`, `src/tracking/locationSyncService.ts`, `src/storage/locationPushQueue.ts`, `mobile/lib/sync/gpsQueueStore.ts`, `mobile/lib/sync/gpsBulkAck.ts`, `mobile/lib/gps/trackingService.ts` |
| Queue types / ownership | `mobile/lib/sync/fieldQueueTypes.ts`, `mobile/lib/sync/queueIds.ts`, `mobile/lib/sync/queueOwnership.ts`, `mobile/lib/sync/pendingCounts.ts` |
| Sync orchestration | `mobile/lib/sync/offlineSyncManager.ts`, `mobile/lib/sync/syncOrchestrator.ts`, `mobile/lib/store/syncStore.ts` |
| Workday end queue | `mobile/lib/sync/workdayOperationQueue.ts` |
| Photos | `mobile/lib/media/persistentVisitPhotos.ts`, `mobile/lib/pendingVisitsQueue.ts`, `mobile/lib/visitSubmitApi.ts` |
| Logout guard | `mobile/lib/sync/logoutGuard.ts`, `mobile/app/(tabs)/profile.tsx`, `src/storage/AuthContext.tsx` |
| UX / i18n | `src/screens/OfflineSyncScreen.tsx`, `src/i18n/en.ts`, `src/i18n/ta.ts` |
| API types | `src/api/tracking.ts` |
| Tests | `scripts/test-offline-sync.mjs`, `package.json` (`test:offline`) |

### Backend

| Area | Files |
|------|-------|
| GPS bulk ack | `tracking/duty_service.py` (`accepted_ids`, `retryable` on `failed_items`, idempotent `end_duty`) |
| Photo dedup | `visits/models.py`, `visits/migrations/0028_visitmedia_client_upload_id.py`, `mobile_api/visits.py` |

---

## 3. Database migrations

| Migration | Description |
|-----------|-------------|
| `visits/migrations/0028_visitmedia_client_upload_id.py` | Adds `VisitMedia.client_upload_id` + unique `(visit, client_upload_id)` when non-empty |

**Deploy:** Run `python manage.py migrate` on staging/production before mobile photo dedup builds ship.

---

## 4. Queue schema changes

### `pending_gps_v1` (`PendingGPSPoint`)

Added: `local_point_id`, `user_id`, `device_session_id`, `sync_status`, `retry_count`, `last_error`, `failure_code`, `created_at`, `updated_at`, `local_workday_id`, `server_workday_id`

### `pending_visits_v1` (`PendingVisit`)

Added: `user_id`, `device_session_id`, `pending_photos[]`, `updated_at`, `last_error`, `quarantined` status

### New: `pending_workday_ops_v1`

Workday end operations with `local_operation_id`, `operation: end`, status, retry metadata

### New: `pending_queue_quarantine_v1`

Orphan / ownership-ambiguous records — **not** auto-attached to current user

---

## 5. Queue migration behavior

- GPS legacy rows receive generated `local_point_id` on load via `migrateGpsQueueRecords()`
- Records **without `user_id`** are **quarantined**, not assigned to the logged-in user
- Visit legacy migrations unchanged; new enqueues stamp `user_id` + `device_session_id`
- Workday ops queue is new — no legacy migration

---

## 6. GPS safety changes

| Before | After |
|--------|-------|
| `clearWorkdayState()` called `clearLocationPushQueue()` | Tracking stops; **GPS queue retained** |
| Bulk flush cleared entire queue on HTTP 207 | Only `accepted_ids` removed via `applyGpsBulkAcknowledgement()` |
| Duty mismatch wiped queue | Points **retained**; flush returns 0 synced |
| No stable point IDs | `local_point_id` sent as `client_point_id` |

**Explicit discard only:** `discardAllGpsQueuePoints()` — not used in normal teardown.

---

## 7. Photo persistence and deduplication

- Photos copied to `documentDirectory/pending-visit-media/<user_id>/<visit_local_sync_id>/`
- Queue stores `pending_photos` with `persistent_file_uri`
- Upload sends `client_upload_id` (= `local_photo_id`) + `X-Device-Session`
- Backend returns existing media on duplicate (`200`, message "Media already uploaded")

---

## 8. User-isolation changes

- `setActiveSyncUserId()` wired in `AuthContext` on employee set/clear
- All sync reads filter by active `user_id`
- Foreign-user rows quarantined to `pending_queue_quarantine_v1`

---

## 9. Logout behavior

- `checkLogoutAllowed()` blocks sign-out when pending visits/photos/GPS/workday ops exist
- Profile shows Sync Now / Stay Signed In (en/ta `fieldWorkflow.logoutBlocked*`)
- Successful full sync allows logout; partial sync keeps user signed in

---

## 10. Offline end-workday behavior

- `endDay()` enqueues local end operation always
- Online: attempts `endDutySession` + ordered sync
- Offline: local end persisted; UI cleared without GPS wipe
- Server end retried via `pending_workday_ops_v1` on reconnect

---

## 11. Sync ordering

`runOrderedFieldSync()`:

1. Validate device session  
2. Flush visits  
3. Flush evidence photos  
4. Flush GPS  
5. Flush workday end ops  

Single-flight lock via `orderedSyncInFlight`. NetInfo reconnect uses debounced scheduler (500ms).

---

## 12. Auto-sync triggers

| Trigger | Behavior |
|---------|----------|
| NetInfo online | Debounced `scheduleDebouncedFieldSync(500)` |
| App init (online) | `syncAll()` → ordered sync |
| Manual Sync | Same |
| GPS enqueue | Debounced flush (1.5s) |
| 45s interval | `autoFlushPendingGps` (GPS only, when online) |
| End workday | Ordered sync when online |

**Not claimed:** upload while app force-closed.

---

## 13. Offline UX

- `fieldWorkflow.*` strings in `en.ts` / `ta.ts`
- `OfflineSyncScreen` shows visits, photos, GPS, workday pending counts + sync phase
- GPS-loss / offline banners: strings ready; mount in tracking banners as follow-up

---

## 14. Automated test results

| Command | Result |
|---------|--------|
| `npm run test:offline` | **Pass** (3/3 GPS ack tests) |
| `npm run typecheck` | **Pass** |
| `python manage.py check` | **Pass** |
| `python manage.py test …` | **Not run** — PostgreSQL not available locally (connection refused) |

---

## 15. Physical-device QA status

**Not executed in this session.** Use `OFFLINE_GPS_SYNC_DEVICE_QA_PLAN.md` — all 20 scenarios remain **Untested** on hardware.

---

## 16. Remaining risks

| Risk | Severity | Notes |
|------|----------|-------|
| Device QA not run | High | Required before client QA |
| Backend migration not deployed | High | Photo dedup needs DB constraint |
| Orphan legacy queues | Medium | Quarantined — needs support remediation UI |
| Farmer cache still ~50 | Medium | Unchanged this phase |
| Visit form draft not persisted | Low | Zustand-only mid-wizard |
| GPS banner wiring incomplete | Low | Copy exists; not all surfaces mounted |
| PostgreSQL tests unverified | Medium | Run in CI/staging |

---

## 17. Rollback guidance

1. **Mobile:** Revert to prior build; MMKV queues remain compatible (extra fields ignored by old builds if not deployed)
2. **Backend:** Migration `0028` is additive; rollback = remove unique constraint field usage in mobile before dropping column
3. **Data:** Quarantined records in `pending_queue_quarantine_v1` — export before rollback if support has remediated orphans

---

## 18. Final verdict

### **Ready for internal offline QA**

Conditions:

- Deploy backend migration `0028`
- Run full device matrix on physical Android
- Confirm release APK with `expo-file-system/legacy` document paths
- Same-user protocol until orphan quarantine tooling exists

**Not yet:** Ready for limited offline client QA (needs device pass + staging deploy).  
**Not yet:** Production-ready offline field workflow.

---

*Implementation completed per `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` phases 1–8, 11–12 (partial).*
