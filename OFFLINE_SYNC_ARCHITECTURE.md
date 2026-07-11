# Offline Sync Architecture — Kavya Agri Clinic Mobile

**Audit date:** 2026-07-11  
**Repos:** Mobile `d:\agri-clinic-mobile` · Backend `d:\agri_clinic`  
**Scope:** Read-only architecture map (no code changes)

---

## 1. Flow diagram (end-to-end)

```text
Mobile UI
  │  Visit submit / GPS capture / Start Workday / Sync Now
  ▼
Local persistence
  │  MMKV ........ pending_visits_v1, pending_gps_v1, pending_visit_evidence_v1
  │  SecureStore . workday session, tokens, device session, last route point
  │  AsyncStorage  master_data_v2 (partial farmers), theme, fallbacks
  │  File URIs ... visit photos (cache / manipulator paths — not a dedicated durable store)
  ▼
Pending queues
  │  Visits ........ offlineSyncManager (status: pending|syncing|failed, attempts)
  │  GPS ........... locationPushQueue → pending_gps_v1 (cap 200)
  │  Evidence ...... pendingEvidenceQueue (post-visit photo retry, max 5)
  │  Workday ....... NOT queued (live API required to start)
  ▼
Connectivity detection
  │  NetInfo listener ........ initOfflineSync() → syncAll() on reconnect
  │  connectivityBus ......... apiClient success/fail (parallel signal)
  │  AppState "active" ....... TrackingContext flush GPS + re-sync workday
  │  Timers .................. 45s GPS auto-flush while app alive
  ▼
Sync worker
  │  syncAll()  [single-flight lock]
  │    ├─ flushVisitQueue()      POST mobile/visits/ (+ attachments)
  │    ├─ flushGPSQueue()        → flushOfflineLocationQueue()
  │    │     bulk POST tracking/location/bulk/  else per-point update/
  │    └─ flushPendingVisitEvidence()
  ▼
Backend API
  │  Visits: local_sync_id unique (employee, local_sync_id)
  │  GPS:    active DutySession required (duty bulk path)
  │  Photos: no client sync id — always new rows
  │  Duty:   start/end not HTTP-idempotent
  ▼
Local acknowledgement / cleanup
  │  Visit OK / duplicate → remove from MMKV visit queue
  │  GPS flush non-throw → clearLocationPushQueue() (entire queue)
  │  Duty mismatch → clear GPS queue (discard)
  │  Photo fail after visit create → visit may leave queue only after photos OK;
  │    alternate path: pending_visit_evidence_v1
```

---

## 2. Local storage technology

| Technology | Used? | Role | Key files |
|------------|-------|------|-----------|
| **MMKV** | Yes (primary) | Visit / GPS / evidence queues + app caches | `mobile/lib/storage.ts` (id `agri-clinic-mobile`) |
| **AsyncStorage** | Yes | Master data, dashboard cache, SecureStore fallbacks, legacy migrations | `src/storage/masterDataCache.ts`, etc. |
| **SecureStore** | Yes | Tokens, device session, active workday, last sent route point, device id | `src/storage/*Storage.ts` |
| **SQLite / WatermelonDB** | **No** | — | — |
| **Zustand persist** | **No** | `useSyncStore`, `useVisitFormStore` are **in-memory only** | `mobile/lib/store/syncStore.ts`, `mobile/store/visitFormStore.ts` |
| **Redux** | **No** | — | — |
| **File system** | Partial | Photo capture/compress via `expo-image-manipulator` / `expo-file-system`; **no copy into `documentDirectory` for pending queue** | `src/utils/visitAttachmentFiles.ts`, `mobile/lib/visitPhotos.ts` |

### Queue / metadata keys

| Key | Store | Contents |
|-----|-------|----------|
| `pending_visits_v1` | MMKV | `PendingVisit[]`: `local_sync_id`, `payload`, `created_at`, `attempts`, `status`, names |
| `pending_gps_v1` | MMKV | GPS push payloads; max **200** (`GPS_QUEUE_MAX_POINTS`) |
| `last_gps_sync_v1` | MMKV | ISO time after successful GPS flush |
| `pending_visit_evidence_v1` | MMKV | Failed photo uploads after visit exists |
| `agri_active_workday_v1` | SecureStore | Cached duty/workday for restore |
| `@agri/master_data_v2` | AsyncStorage | Districts/villages/crops/problems + **first ~50 farmers** |

`clearAppStorage()` in `mobile/lib/storage.ts` can wipe MMKV app keys but is **not wired to logout**.

---

## 3. Offline queue models

### Visits (`offlineSyncManager.ts`)

- Enqueue: `addToVisitQueue` / `enqueuePendingVisit` — dedupes by `local_sync_id`
- Statuses: `pending` | `syncing` | `failed`
- Retry: `MAX_VISIT_ATTEMPTS = 3`; network errors stay `pending`; non-network increments attempts → `failed`
- Stuck recovery: `resetStuckSyncingVisits()` on flush / init
- Remove API exists (`removeVisitFromQueue`) — **no employee UI for cancel/edit**

### GPS (`locationPushQueue` → MMKV)

- Append on upload failure (except duty-session mismatch)
- Cap 200 → oldest dropped
- Flush: bulk then per-point fallback; success clears **all** queued points
- Duty mismatch on flush → **clear queue without re-queue** (`locationSyncService.ts`)

### Photos

1. Embedded on visit payload as `__pending_attachments` (URIs)
2. Separate `pendingEvidenceQueue` if visit created online but media failed

### Workday

- **No offline start queue**
- Active session cached in SecureStore after successful online start
- End: best-effort GPS flush then `endDutySession`; `clearWorkdayState` **clears GPS queue**

### Conflict / retry metadata

- Visit: `attempts`, `status`, `local_sync_id`
- GPS: no per-point retry counter; no client point UUID
- Evidence: attempts up to 5; rows retained after max for diagnostics
- No formal conflict-resolution protocol beyond visit `local_sync_id` + device session 409

---

## 4. Connectivity, app state, background

| Mechanism | File | Behavior |
|-----------|------|----------|
| NetInfo | `initOfflineSync()` | Online → `syncAll()`; 45s GPS flush interval |
| API connectivity bus | `src/utils/connectivityBus.ts` + `api/client.ts` | Separate online flag from NetInfo |
| AppState | `TrackingContext.tsx` | Foreground → sync workday + flush GPS queue |
| Background location task | `registerBackgroundLocationTask.ts` | OS delivers locations → queue; **flush needs app process / reconnect** |
| OfflineSyncContext | auto `syncAll` when `online && pendingCount > 0` | Visit-focused auto sync |

**No** dedicated headless sync worker when the app is force-stopped (except native location task writing points into the queue).

---

## 5. Authentication & session restoration

| Concern | Behavior | File |
|---------|----------|------|
| Fast bootstrap | Tokens + device session from SecureStore → authenticated without network | `AuthContext.tsx` `runFastLocalBootstrap` |
| Background validate | `getCurrentEmployee()`; network issues keep local session | same |
| Device session | `X-Device-Session`; 409 SESSION_REPLACED | backend `DeviceSessionRequiredMixin` |
| Logout | Clears tokens, device session, workday cache, master cache | `performLocalSignOut` |
| Logout gap | **Does not clear** visit / GPS / evidence MMKV queues | risk: next user on same device |

---

## 6. Backend touchpoints (canonical mobile)

| Domain | Endpoint | Idempotency |
|--------|----------|-------------|
| Visit create | `POST mobile/visits/` | Strong via `local_sync_id` (+ DB unique) |
| Visit media | `POST mobile/visits/{id}/media/` (+ attachments fallback) | **None** — retry duplicates |
| Duty start | `POST tracking/duty/start/` | **Not** idempotent (400 if already started) |
| Duty end | `POST tracking/duty/end/` | 400 if none |
| GPS bulk | `POST tracking/location/bulk/` | Partial (per-point atomic; **no client point id**) |
| GPS single | `POST tracking/location/update/` | No client point id |
| Farmers | `GET mobile/farmers/` | No delta / sync cursor |
| Auth refresh | `POST mobile/auth/refresh/` | Standard JWT; no device-session check |

---

## 7. Sync trigger map (summary)

See also the trigger table in `OFFLINE_GPS_AUTO_SYNC_COMPLETE_AUDIT.md` §7.

Automatic sync **does exist** for visits + GPS + evidence when NetInfo reports online, on app init if online, and when OfflineSyncContext sees pending visits. GPS also flushes on AppState active and periodic timers while the JS runtime is alive.

---

## 8. Architecture gaps (honest)

1. Workday start is **online-only** — not part of the offline queue graph.
2. Queues are JSON blobs in MMKV — no transactional DB, no per-user scoping of keys.
3. Photo durability depends on ephemeral file URIs.
4. GPS flush acknowledgement is all-or-nothing clear; mobile does not parse duty bulk `failed_items` / 207.
5. Ending workday / duty mismatch can **discard** queued GPS.
6. Dual connectivity signals (NetInfo vs API bus) can briefly disagree.

---

## 9. Key file index

| Concern | Path |
|---------|------|
| Sync orchestrator | `mobile/lib/sync/offlineSyncManager.ts` |
| Evidence queue | `mobile/lib/sync/pendingEvidenceQueue.ts` |
| Visit enqueue UI path | `mobile/app/visit/create-step4-review.tsx`, `mobile/lib/pendingVisitsQueue.ts` |
| GPS sync | `src/tracking/locationSyncService.ts` |
| GPS queue | `src/storage/locationPushQueue.ts`, `mobile/lib/gps/trackingService.ts` |
| Workday start | `mobile/lib/workday.ts`, `src/storage/TrackingContext.tsx` |
| Offline UI context | `src/storage/OfflineSyncContext.tsx` |
| Init | `AppProviders.tsx` → `initOfflineSync()` + `AutomaticSyncProvider` |
| Automatic coordinator | `mobile/lib/sync/automaticSyncCoordinator.ts` |
| Background worker | `expo-background-task` → `registerBackgroundFieldSyncTask.ts` |
| Backend visits | `d:\agri_clinic\mobile_api\visits.py` |
| Backend duty GPS | `d:\agri_clinic\tracking\duty_service.py` |
