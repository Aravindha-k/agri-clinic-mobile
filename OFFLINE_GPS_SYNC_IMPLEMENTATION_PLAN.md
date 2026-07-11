# Offline / GPS Sync — Implementation Plan

**Product:** Kavya Agri Clinic  
**Date:** 2026-07-11  
**Repos:** Mobile `d:\agri-clinic-mobile` · Backend `d:\agri_clinic`  
**Status:** Planning only — **no code modified**  
**Decision doc:** `OFFLINE_FIELD_WORKFLOW_DECISION.md`

---

## 2. Ideal full-day field scenario (step-by-step)

Sequence: login online → start workday → lose internet → GPS on → 2 visits + photos → background → force-close → reopen offline → GPS off/on → reconnect → sync → end workday.

| Step | UI state | Local data written | Queue item | Retry | Backend op | Success ack | Failure behavior | Duplicate prevention |
|------|----------|-------------------|------------|-------|------------|-------------|------------------|---------------------|
| 1. Login online | Home unlocked | Tokens + `device_session_id` → SecureStore (`tokenStorage.ts`, `deviceSessionStorage.ts`) | None | Login retry | `POST mobile/auth/login/` | Tokens saved | Network error → retry | New device session deactivates prior (`register_device_session`) |
| 2. Start workday online | Workday active; tracking banner | `agri_active_workday_v1` SecureStore (`saveDutySessionFromWorkday`) | None (no workday queue) | Poll `workday/current/` on “already started” | `POST tracking/duty/start/` | Duty + workday IDs cached | API fail → alert; no local active | Client checks local active; server 400 on double start |
| 3. Lose internet | Offline banner; workday still active | `usingCachedWorkday` in TrackingContext | GPS points → `pending_gps_v1` on upload fail | Next flush trigger | N/A | N/A | Points queue via `appendLocationPush` | Movement filter (`shouldSendLocation`) |
| 4. GPS available, offline | Route/map may show last point | Each point appended to MMKV | `PendingGPSPoint` in `pending_gps_v1` | 45s timer, foreground, reconnect | N/A (buffer only) | N/A | Cap 200 → oldest dropped | Throttle on server at sync time |
| 5. Farmer list | Work tab list from cache | Read `@agri/master_data_v2` | None | N/A | N/A | N/A | Empty/stale if never synced | N/A |
| 6. Create visit 1 offline | “Saved offline” / pending section | `pending_visits_v1` row | `PendingVisit` + `local_sync_id` | `syncAll` on reconnect | N/A until sync | N/A | Validation blocks bad GPS | `local_sync_id` UUID; queue dedupes by id |
| 7. Capture photos | Thumbnails in form | URIs in `__pending_attachments` inside visit payload | Embedded in visit queue | With visit flush | N/A | N/A | **P0:** cache URI may break | N/A until photo dedup |
| 8. Create visit 2 | Same | Second queue row | Same | Same | Same | Same | Same | Unique `local_sync_id` per visit |
| 9. App backgrounded | Workday active; OS may continue bg location | Background task may append GPS (`registerBackgroundLocationTask.ts`) | More GPS points | Flush when JS alive | N/A | N/A | OEM may kill bg task | N/A |
| 10. Force-close | Process killed | MMKV + SecureStore persist | Queues intact | On next open | N/A | N/A | Zustand visit draft lost; **photo URIs at risk** | Visit ids stable in MMKV |
| 11. Reopen offline | Workday restored; pending counts | `readCachedActiveWorkday` + MMKV queues | Existing rows | `initOfflineSync` skips sync if offline | N/A | N/A | Tracking resumes if permissions OK | Same user session |
| 12. GPS off | Warning: location lost; workday active | No new points | None | Resume when fix returns | N/A | N/A | No fabricated coords | N/A |
| 13. GPS on | “Tracking resumed” (target) | Points append again | GPS queue grows | Same as step 4 | N/A | N/A | Gap not recorded today | N/A |
| 14. Internet returns | “Syncing field data…” | NetInfo → `syncAll()` | Flush in flight | Single-flight lock | Parallel flush today (see §8) | Remove ack’d items | Per-item failure handling | Visit `local_sync_id`; GPS/photo gaps |
| 15. Visits sync | Pending count drops | Remove from `pending_visits_v1` | — | Max 3 attempts → `failed` | `POST mobile/visits/` | 200 + `duplicate: true` OK | Network → pending; validation → failed | DB `uniq_visit_employee_local_sync_id` |
| 16. Photos sync | Progress in sync UI | Evidence queue or inline upload | `pending_visit_evidence_v1` if split | Up to 5 attempts | `POST mobile/visits/{id}/media/` | All files uploaded | **Duplicates on retry today** | **P0:** client photo id + server unique |
| 17. GPS sync | Route updates | Clear only ack’d points (**target**) | — | Next trigger for failures | `POST tracking/location/bulk/` | 201 all success; 207 partial | **Today:** clears entire queue | **P1:** `local_point_id` |
| 18. End workday | “Ended — pending sync” if offline | Local end record (**target**); today calls API then clears | Workday end queue (**target P1**) | Retry end after deps | `POST tracking/duty/end/` | Server end ack | **Today:** `clearWorkdayState` wipes GPS | End only after GPS flush ack |
| 19. Final flush | All synced | Queues empty | — | Manual sync if needed | Refresh server state | `last_gps_sync_v1`, `lastSyncedAt` | Failed items quarantined | N/A |

---

## 3. Offline Start Workday — design reference

**V1.0 decision:** Option A (online required). See `OFFLINE_FIELD_WORKFLOW_DECISION.md` §3.

### If Option B is implemented later (P1)

```text
User taps Start Workday (offline)
→ generate local_workday_id (UUID)
→ capture GPS fix + user_id + device_session_id + started_at
→ persist ActiveWorkdayCache with server_workday_id = null
→ enqueue WorkdayQueueItem { operation: start, status: pending }
→ start local GPS tracking (buffer all points with local_workday_id)
→ UI: "Workday started on device — will confirm when online"
→ on sync: POST duty/start OR idempotent "return existing"
→ map local_workday_id → server duty_session_id / workday_id
→ rewrite GPS + visit queue rows with server IDs
→ on server rejection: quarantine + officer message (do not silently drop)
```

**Backend prerequisites for Option B:**

- Idempotent duty start returning existing session
- DB constraint: one active duty per user
- Accept GPS bulk with `local_workday_id` before server duty exists OR hold GPS until start ack

---

## 4. GPS behavior independent from internet

### State matrix (intended V1.0)

| State | Workday active? | GPS recorded? | Warning | Visits allowed? | Coordinates | Resume |
|-------|-----------------|---------------|---------|-----------------|-------------|--------|
| Online + GPS available | Yes if started | Yes, live upload | None | Yes (with fix at submit) | Required at visit submit | N/A |
| Offline + GPS available | Yes (cached) | Yes, queued | Offline banner | Yes (SL) | Required at submit | Auto flush on reconnect |
| Online + GPS unavailable | Yes | No | Location signal lost | Submit **blocked** until fix | Never fabricated | Auto when fix returns |
| Offline + GPS unavailable | Yes | No | Location lost + offline | Submit **blocked** | Never fabricated | Queue resumes with fix |
| GPS low accuracy | Yes | Flag/reject per gate | Accuracy warning | Visit submit may block (`visitValidation`) | Poor accuracy rejected at submit | Better fix |
| Permission revoked | Yes (local) | No | Open Settings | Submit blocked | N/A | After permission grant |
| Background restricted | Yes | Partial (OS dependent) | Background tracking limited | Yes if GPS available in foreground | Real fixes only | User opens app |
| Battery saver | Yes | May pause bg task | Tracking may pause | Same | Real fixes only | OEM-dependent |

**Files today:** `TrackingContext.tsx`, `gpsStateReport.ts`, `fieldLocationBlocked`, `WorkdayStartPanel.tsx`, `visitValidation.ts`, `shouldSendLocation.ts`.

---

## 5. Persistent queue models

### 5.1 Target schemas

#### Workday queue (not implemented)

```text
local_workday_id, server_workday_id, server_duty_session_id,
user_id, device_session_id,
operation: start | end,
started_at, ended_at,
latitude, longitude, accuracy (start),
status: pending | syncing | synced | failed | quarantined,
retry_count, last_error, created_at, updated_at
```

#### Visit queue (partial — `offlineSyncManager.ts`)

| Field | Current | Missing |
|-------|---------|---------|
| `local_sync_id` | ✅ | — |
| `user_id` | ❌ | **P0** |
| `device_session_id` | ❌ | P1 |
| `farmer_id` | In payload only | Explicit top-level |
| `local_workday_id` | ❌ | P1 |
| `server_workday_id` | ❌ | P1 |
| `payload` | ✅ | — |
| `photo references` | `__pending_attachments` URIs | Durable `persistent_file_uri` per photo |
| `status` | ✅ | Add `quarantined` |
| `retry_count` | `attempts` ✅ | — |
| `last_error` | ❌ | P1 |
| `created_at` | ✅ | `updated_at` |

#### GPS queue (partial — `PendingGPSPoint`)

| Field | Current | Missing |
|-------|---------|---------|
| `local_point_id` | ❌ | **P1** (for partial ack + dedup) |
| `user_id` | ❌ | **P0** |
| `local_workday_id` | ❌ | P1 |
| `server_workday_id` | In payload as `duty_session_id?` | Explicit mapping |
| `timestamp` | `recorded_at` ✅ | — |
| `latitude, longitude, accuracy, speed, heading` | ✅ | — |
| `sync_status` | Implicit (in queue = pending) | Explicit per point |
| `retry_count` | ❌ | P1 |
| `last_error` | ❌ | P1 |

**Storage:** MMKV `pending_gps_v1`; legacy migration from SecureStore `agri_pending_location_push_v2`.

#### Photo queue (partial — visit payload + `pendingEvidenceQueue.ts`)

| Field | Current | Missing |
|-------|---------|---------|
| `local_photo_id` | ❌ | **P0** |
| `local_sync_id` / `visit_local_sync_id` | Evidence queue has optional `local_sync_id` | Required on all paths |
| `persistent_file_uri` | ❌ (cache URI) | **P0** |
| `mime_type, size` | Partial in `VisitPhotoAsset` | Persist in queue |
| `checksum / dedup key` | ❌ | **P0** |
| `upload_status` | Implicit | Explicit |
| `retry_count` | `attempts` in evidence | Unified |
| `server_photo_id` | ❌ | After ack |

### 5.2 Storage keys (current)

| Key | Store | Scoped by user? |
|-----|-------|-----------------|
| `pending_visits_v1` | MMKV | ❌ |
| `pending_gps_v1` | MMKV | ❌ |
| `pending_visit_evidence_v1` | MMKV | ❌ |
| `agri_active_workday_v1` | SecureStore | ❌ (cleared on logout) |

**Recommendation:** Prefix keys with `user_{employee_id}_` or embed `user_id` and filter in every read/write (**P0**).

---

## 6. Queue ownership and logout rules

### Ownership contract

Every queue item **must** include:

- `user_id` (employee id from auth)
- `device_session_id` (at enqueue time)
- `local_workday_id` or `server_duty_session_id` where applicable

Sync workers **must** verify `user_id === currentEmployee.id` before upload. Mismatch → do not sync; surface quarantine message.

### Logout — recommended V1.0 behavior (safest practical)

**Block normal logout** when `pendingVisits + pendingGps + pendingEvidence > 0`:

```text
You have unsynced field data. Connect to the internet and sync before signing out.
```

Actions: **Sync Now** · **Stay Signed In**

**Emergency sign-out (P2):** Admin/support-only “Discard local data and sign out” with typed confirmation — not in V1.0 employee UI.

### Current behavior (unsafe)

| Path | File | Behavior |
|------|------|----------|
| `signOut()` | `AuthContext.tsx` | `runPreSignOutHandlers()` → `performLocalSignOut()` |
| Pre-sign-out | `TrackingContext.endActiveWorkdayOnServer` | Best-effort flush + end duty |
| Local sign-out | `performLocalSignOut` | Clears tokens, device session, workday cache, master cache — **queues remain** |
| `clearAppStorage()` | `mobile/lib/storage.ts` | Can wipe MMKV — **never called on logout** |

**Cross-user risk:** User B logs in → `syncAll()` uploads User A’s `pending_visits_v1` under User B’s JWT.

---

## 7. Synchronization triggers

| Trigger | Workday | Visits | Photos | GPS | Requirements |
|---------|---------|--------|--------|-----|--------------|
| App bootstrap (`initOfflineSync`) | No | Yes | Yes (evidence) | Yes | Online at init |
| NetInfo reconnect | No | Yes | Yes | Yes | `offlineSyncManager.initOfflineSync` |
| App foreground (`TrackingContext` AppState active) | Re-sync workday status | No | No | Yes flush | Workday was active |
| App foreground (home `index.tsx`) | No | No | No | `autoFlushPendingGps` | — |
| OfflineSyncContext (`online && pendingCount`) | No | Yes (`syncAll`) | Yes | Yes | Pending visits > 0 |
| Manual Sync Now | No | Yes | Yes | Yes | User action |
| Visit submit (online) | No | Direct POST | Direct / evidence | N/A | — |
| Visit submit (offline) | No | Enqueue only | Embedded | N/A | — |
| Workday start | API start | No | No | First point | **Network required** |
| Workday end | API end + **clears GPS (bug)** | Pre-flush via visit path if manual sync | Via visit flush | Flush then clear | Network for server end |
| Pre-sign-out | End duty attempt | Flush in handler | Flush | Flush | Best-effort |
| 45s interval | No | No | No | Yes | JS runtime alive |
| GPS enqueue debounce (1.5s) | No | No | No | Yes | — |
| Background location task | No | No | No | Append queue only | **No flush** — needs app open |
| Periodic background fetch | **Not implemented** | No | No | No | — |

### Background sync verdict

| Capability | Supported? | Evidence |
|------------|------------|----------|
| Background GPS **capture** | Partial | `registerBackgroundLocationTask.ts`, `backgroundLocationService.ts` |
| Background GPS **upload** | **No** | Flush requires JS (`locationSyncService`, `initOfflineSync` interval) |
| Background visit/photo sync | **No** | No `expo-background-fetch` / headless task |
| Sync while app force-stopped | **No** | MMKV persists; upload waits for reopen + online |

**Do not claim background sync in product copy.** Say: “Data uploads when the app is open and internet is available.”

---

## 8. Synchronization ordering

### Target dependency order

```text
1. Authenticate + validate device session (X-Device-Session)
2. Sync workday START (if queued — P1)
3. Sync visits (POST mobile/visits/ — does not require active duty)
4. Sync visit photos (needs server visit_id)
5. Sync GPS batches (requires active duty on server)
6. Sync workday END (if queued — P1)
7. Refresh server state (workday current, dashboard)
```

### Current `syncAll()` (`offlineSyncManager.ts`)

Runs **in parallel**:

```text
flushVisitQueue() || flushGPSQueue() || flushPendingVisitEvidence()
```

Usually acceptable because visits do not require active duty; GPS does. **Risk:** ending workday before GPS flush completes.

### Failure isolation rules

| Failure | Must not block | Behavior |
|---------|----------------|----------|
| Workday start fails | Visits already queued | Hold GPS until duty exists; visits can still sync |
| One visit validation fails | Other visits | Mark that visit `failed` / `quarantined`; continue |
| One photo fails | Visit row on server | Keep evidence queue item; visit stays until photos done or split policy |
| One GPS point fails | Other points | **P0:** retain failed only (`failed_items`) |
| Device session 409 | All writes | Teardown auth; **do not** sync queues until re-login same user |
| User disabled | All writes | Quarantine with message |
| Farmer deleted | That visit | Quarantine visit; officer remediation |
| Workday ended on server | GPS flush | **Today:** mismatch clears queue — **must change** to retain + rebind |

---

## 9. GPS partial-batch acknowledgement

### Backend (actual)

**Endpoint:** `POST /api/tracking/location/bulk/`  
**View:** `BulkLocationSyncAPI` (`tracking/duty_views.py`)  
**Service:** `bulk_update_locations()` (`tracking/duty_service.py`)

**Response (207 partial):**

```json
{
  "success": true,
  "message": "Bulk locations synced with partial failures",
  "data": {
    "success_count": 3,
    "failed_count": 1,
    "failed_items": [
      { "index": 3, "code": "INVALID_POINT", "message": "..." }
    ],
    "route_points_saved": 2,
    "duty_session_id": 42,
    "workday_id": 17
  }
}
```

**Note:** `accepted_ids` does **not** exist. Mobile must map by **batch index** or future `local_point_id`.

### Mobile (actual — broken)

**File:** `src/tracking/locationSyncService.ts`  
**Function:** `flushOfflineLocationQueue()` (lines 117–164)

```text
pushLocationsBulk(queue) → on non-throw → clearLocationPushQueue()  // entire queue
catch duty mismatch → clearLocationPushQueue()  // data loss
```

**File:** `src/api/tracking.ts` → `pushLocationsBulk()` — does not inspect response body for `failed_items`.

### Target behavior

```text
Upload batch
→ read status 201 (all ok) or 207 (partial)
→ parse success_count + failed_items[]
→ remove queue entries at indices where upload succeeded
→ retain failed entries with last_error + retry_count
→ retry recoverable (network, throttle) on next trigger
→ quarantine permanent (INVALID_POINT) with UI message
```

### Recommended backend enhancement (P1)

Add optional `client_point_id` per point in bulk payload; return in `failed_items`:

```json
{
  "failed_items": [
    {
      "index": 3,
      "client_point_id": "uuid",
      "code": "THROTTLED",
      "message": "...",
      "retryable": true
    }
  ]
}
```

Until then, mobile maps by **stable queue index** or assigns `local_point_id` client-side and sends as extra field (ignored by server if unknown).

---

## 10. Photo persistence and deduplication

### Current path (unsafe)

```text
ImagePicker / Camera
→ compressVisitPhoto() (expo-image-manipulator) → cache URI
→ visitFormStore / __pending_attachments in MMKV JSON
→ upload via uploadVisitPhotos() / flushVisitQueue
→ on partial fail: pendingEvidenceQueue (still cache URIs)
```

**Files:** `mobile/lib/visitPhotos.ts`, `mobile/lib/visitSubmitApi.ts`, `mobile/lib/sync/pendingEvidenceQueue.ts`, `src/utils/visitAttachmentFiles.ts`

**Android risk:** Cache eviction on restart, low storage, or `clear cache` removes files before sync.

### Target behavior

```text
Photo selected
→ copy to FileSystem.documentDirectory/visit_media/{local_photo_id}.jpg
→ compute SHA-256 checksum
→ store PendingPhoto { local_photo_id, persistent_file_uri, checksum, visit_local_sync_id }
→ upload with header or field: X-Idempotency-Key: {visit_local_sync_id}:{local_photo_id}
→ backend dedupe on (visit_id, client_upload_id) or (employee, checksum)
→ delete local file only after 201 + server_photo_id ack
```

### Backend gap

`MobileVisitMediaUploadAPI` (`mobile_api/visits.py`) — always `VisitMedia.objects.create()`. No unique constraint.

**Also:** `uploadVisitMedia()` in `visitSubmitApi.ts` may omit `X-Device-Session` on XHR path → 409 in production.

---

## 11. End Workday behavior

### Expected (target)

```text
User taps End Workday
→ capture final GPS point if available
→ persist local end intent (queue — P1)
→ stop tracking loops
→ attempt flush visits / photos / GPS (in order)
→ if offline: UI "Workday ended on device — pending sync"
→ call endDutySession only after GPS flush ack OR queue end for retry
→ clear queues only after server ack
→ clear workday cache last
```

### Current bug — exact location

**File:** `src/storage/TrackingContext.tsx`

```798:809:src/storage/TrackingContext.tsx
  const endDay = useCallback(async () => {
    // ...
    try {
      await flushPendingLocationQueue();
    } catch {
      /* keep queued points for next session */
    }
    await endDutySession(await getActiveDutySessionId());
    clearWorkdayState({ showInactiveBanner: true });  // always runs
```

**`clearWorkdayState` (lines 233–244)** unconditionally calls `clearLocationPushQueue()` — **wiping unsynced GPS** even when flush failed or was skipped.

**Secondary wipe:**

- `teardownTracking()` line 268 — same clear
- `flushOfflineLocationQueue` catch on `isDutySessionMismatchMessage` — `locationSyncService.ts:155–157`

### Smallest safe fix (P0)

1. Remove `clearLocationPushQueue()` from `clearWorkdayState` and `teardownTracking`.
2. Only clear GPS queue after `flushOfflineLocationQueue` returns full success with per-point ack.
3. On duty mismatch: **retain** queue + set flag `gps_sync_blocked_reason`; show officer message.
4. On end workday offline: skip `endDutySession` API; set local status `ended_pending_sync`; queue end operation (P1).

---

## 12. User-facing offline states (localization)

Add under `fieldWorkflow` in `src/i18n/en.ts` and `src/i18n/ta.ts` (project convention: nested keys, `{{count}}` interpolation).

| Key | English | Tamil (ta) |
|-----|---------|------------|
| `fieldWorkflow.offlineBanner` | Offline — your work is being saved on this device. | ஆஃப்லைன் — உங்கள் பணி இந்த சாதனத்தில் சேமிக்கப்படுகிறது. |
| `fieldWorkflow.pendingSync` | {{visits}} visits and {{points}} location points waiting to sync. | {{visits}} விசிட்டுகள் மற்றும் {{points}} இருப்பிடப் புள்ளிகள் ஒத்திசைவுக்காக காத்திருக்கின்றன. |
| `fieldWorkflow.syncing` | Syncing field data… | களத் தரவை ஒத்திசைக்கிறது… |
| `fieldWorkflow.partialFailure` | Some data could not sync. Your data is still saved on this device. | சில தரவு ஒத்திசைக்க முடியவில்லை. உங்கள் தரவு இன்னும் இந்த சாதனத்தில் உள்ளது. |
| `fieldWorkflow.gpsLost` | Location signal lost. Workday remains active and tracking will resume automatically. | இருப்பிட சிக்னல் இல்லை. பணிநாள் செயலில் உள்ளது; கண்காணிப்பு தானாக மீண்டும் தொடங்கும். |
| `fieldWorkflow.gpsRestored` | Location tracking resumed. | இருப்பிடக் கண்காணிப்பு மீண்டும் தொடங்கியது. |
| `fieldWorkflow.workdayEndedOffline` | Workday ended on this device. It will update on the server when internet returns. | பணிநாள் இந்த சாதனத்தில் முடிந்தது. இணையம் வந்ததும் சர்வரில் புதுப்பிக்கப்படும். |
| `fieldWorkflow.startWorkdayNeedsInternet` | Internet is required to start your workday. Once started, visits and location can continue offline. | உங்கள் பணிநாளைத் தொடங்க இணையம் தேவை. தொடங்கிய பிறகு, விசிட்டுகள் மற்றும் இருப்பிடம் ஆஃப்லைனில் தொடரலாம். |
| `fieldWorkflow.logoutBlocked` | You have unsynced field data. Connect to the internet and sync before signing out. | ஒத்திசைக்கப்படாத களத் தரவு உள்ளது. வெளியேறுவதற்கு முன் இணையத்துடன் இணைத்து ஒத்திசைக்கவும். |
| `fieldWorkflow.syncNow` | Sync now | இப்போது ஒத்திசை |
| `fieldWorkflow.staySignedIn` | Stay signed in | உள்நுழைந்திருக்கவும் |

Wire to: `GlobalStatusStrip`, `OfflineSyncScreen`, `WorkVisitsPanel`, workday end dialog, profile sign-out guard.

---

## 13. Implementation backlog

### P0 — Data-loss and security blockers

| Priority | Task | Mobile files | Backend files | Migration | API change | Risk | Tests |
| -------- | ---- | ------------ | ------------- | --------- | ---------- | ---- | ----- |
| P0 | Remove unconditional GPS queue clear on end/teardown | `TrackingContext.tsx` (`clearWorkdayState`, `teardownTracking`, `endDay`) | — | No | No | High if wrong — retest end day | Device QA #9, #1 |
| P0 | Retain GPS on duty mismatch; surface error | `locationSyncService.ts`, `workdayStatus.ts` | — | No | No | Medium | Device QA #10 |
| P0 | Parse 207 + `failed_items`; partial queue removal | `locationSyncService.ts`, `api/tracking.ts` | `duty_views.py` (document 207) | No | Optional `client_point_id` | High | Device QA #10, unit test mock 207 |
| P0 | Add `user_id` to all queue records; filter on sync | `offlineSyncManager.ts`, `pendingEvidenceQueue.ts`, `locationPushQueue.ts`, `gps/trackingService.ts` | — | Queue shape migration on read | No | Critical security | Device QA #14, #15 |
| P0 | Block logout when pending > 0 | `AuthContext.tsx`, `profile.tsx` | — | No | No | Low UX friction | Device QA #14 |
| P0 | Copy photos to documentDirectory | `visitPhotos.ts`, `visitAttachmentFiles.ts`, `pendingVisitsQueue.ts`, `pendingEvidenceQueue.ts` | — | No | No | High — storage | Device QA #3, #5, #19 |
| P0 | Photo client id + upload idempotency key | `visitSubmitApi.ts`, `visitAttachments.ts` | `visits/models.py`, `mobile_api/visits.py`, migration unique on `(visit_id, client_upload_id)` | Yes | New optional field | Medium | Device QA #11, #16 |
| P0 | Fix `uploadVisitMedia` XHR to send `X-Device-Session` | `visitSubmitApi.ts` | — | No | No | Medium | API test with session |

### P1 — Reliable offline workflow

| Priority | Task | Mobile files | Backend files | Migration | API change | Risk | Tests |
| -------- | ---- | ------------ | ------------- | --------- | ---------- | ---- | ----- |
| P1 | Offline workday end queue | `TrackingContext.tsx`, new `workdayQueue.ts` | `duty_views.py` idempotent end | MMKV key | Optional | Medium | Device QA #9 |
| P1 | Evaluate offline workday start (Option B) | `workday.ts`, `workdaySessionStorage.ts` | `duty_service.py` idempotent start + DB unique active duty | Yes | Idempotent start | High | New scenarios |
| P1 | Ordered sync (visits → photos → GPS → end) | `offlineSyncManager.ts` | — | No | No | Medium | Integration test |
| P1 | Exponential backoff visits/GPS | `offlineSyncManager.ts`, `locationSyncService.ts` | — | No | No | Low | Unit |
| P1 | Partial sync UI with per-domain counts | `OfflineSyncScreen`, `syncStore.ts`, `GlobalStatusStrip` | — | No | No | Low | Device QA #6 |
| P1 | GPS loss/resume toasts (i18n §12) | `TrackingContext.tsx`, `en.ts`, `ta.ts` | — | No | No | Low | Device QA #7, #8 |
| P1 | `local_point_id` on GPS + server dedup | `offlineSyncManager.ts`, `locationPushQueue.ts` | `duty_service.py`, `EmployeeRoutePoint` model | Yes | Bulk payload field | Medium | Device QA #16 |
| P1 | Expand offline farmer pack / search | `masterDataCache.ts`, farmer APIs | `mobile_api/farmers.py` delta or full page cache | No | Optional cursor | Medium | Offline farmer tests |
| P1 | Visit form draft persistence | `visitFormStore.ts` | — | AsyncStorage key | No | Low | Device QA #5 |
| P1 | Idempotent duty start (return existing) | `api/tracking.ts` | `duty_service.py`, migration | Yes | 200 existing session | High | Concurrency test |

### P2 — Operational enhancements

| Priority | Task | Mobile files | Backend files | Migration | API change | Risk | Tests |
| -------- | ---- | ------------ | ------------- | --------- | ---------- | ---- | ----- |
| P2 | Queue diagnostics screen (support) | New screen, `offlineSyncManager.ts` | Admin endpoint | No | Optional | Low | Manual |
| P2 | Background fetch for sync (if proven) | New native task | — | No | No | High complexity | Device + battery |
| P2 | Failed-item quarantine + officer remediation | OfflineSyncScreen | — | No | No | Low | UX review |
| P2 | Storage cleanup job (orphan photos) | `visitPhotos.ts` | — | No | No | Low | Low storage QA |
| P2 | Admin sync-health reporting | — | New analytics | No | Yes | Low | Backend |
| P2 | Emergency discard sign-out | `profile.tsx` | Audit log | No | No | Medium | Policy review |
| P2 | Unify NetInfo + connectivityBus | `connectivityBus.ts`, `OfflineSyncContext.tsx` | — | No | No | Low | Unit |
| P2 | Record GPS gap events for reporting | `TrackingContext.tsx` | `tracking/models.py` | Yes | Optional gap event | Medium | Analytics |

### Recommended implementation order

```text
1. P0 GPS queue safety (end day + mismatch + partial ack)
2. P0 user_id scoping + logout block
3. P0 durable photos + session header fix
4. P0 photo dedup (mobile + backend)
5. P1 ordered sync + offline end queue
6. P1 UX copy + partial sync UI
7. P1 offline start evaluation (only if field demands)
8. Execute OFFLINE_GPS_SYNC_DEVICE_QA_PLAN.md
9. P2 operational tooling
```

---

*End of implementation plan. No application code was changed.*
