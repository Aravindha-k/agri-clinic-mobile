# Offline, GPS-Loss, Data Persistence & Auto-Sync — Complete Audit

**Product:** Kavya Agri Clinic mobile  
**Repos:** `d:\agri-clinic-mobile` (mobile) · `d:\agri_clinic` (backend)  
**Audit date:** 2026-07-11  
**Method:** Full code-path trace (UI → storage → sync worker → API → DB constraints). **No code was modified.**  
**Companion docs:** `OFFLINE_SYNC_ARCHITECTURE.md`, `OFFLINE_GPS_SYNC_TEST_MATRIX.md`

---

## 1. Executive summary

The app has a **real offline visit queue** (MMKV + `local_sync_id`), a **real GPS offline buffer** (MMKV, bulk upload), **auto-sync on reconnect**, and **workday restore from SecureStore**. That is more than a stub.

It is **not** a complete offline field workflow:

- **Start Workday cannot run offline** (live duty API required).
- **Photos are high-risk** (ephemeral URIs; server has no photo idempotency).
- **Ending workday / duty mismatch can wipe the GPS queue**.
- **Logout does not clear pending queues** → cross-user data risk on shared devices.
- **Farmer directory offline is only a small cache (~50)**.
- GPS flush does not process partial bulk failures (`failed_items` / 207).

### Final verdict

**Partial offline support — internal QA only**

A field officer can often create visits and buffer GPS **after** an online workday start, then sync when connectivity returns — but full-day unreliable network/GPS use is **not** production-safe without fixing the P0 items below.

---

## 2. Current offline capabilities

| Capability | Status | Evidence |
|------------|--------|----------|
| Offline visit submit | **Supported** | `create-step4-review.tsx` → `enqueuePendingVisit` → `pending_visits_v1` |
| Visit idempotency | **Strong (visits)** | Mobile + `FieldVisitSubmitSerializer` + DB `uniq_visit_employee_local_sync_id` |
| Offline GPS buffering | **Supported** (after duty started) | `locationSyncService.syncLocationPoint` → `pending_gps_v1` |
| Auto-sync on reconnect | **Supported** | `initOfflineSync` NetInfo → `syncAll()` |
| Auto-sync on app start (if online) | **Supported** | Same |
| Offline Start Workday | **Unsupported** | `mobile/lib/workday.ts` requires `ensureActiveWorkday` |
| Offline End Workday | **Unsupported / unsafe** | Needs API; clear path drops GPS queue |
| Full farmer catalog offline | **Unsupported** | `masterDataCache` first page only |
| Durable photo store | **Unsupported** | No `documentDirectory` copy for queue |
| SQLite offline DB | **Not used** | MMKV JSON only |
| Background headless sync (app killed) | **Unsupported** | Location task may queue; flush needs JS runtime |

---

## 3. Current GPS-loss behavior

| Situation | Behavior |
|-----------|----------|
| GPS / permission off during workday | `gpsState`, `fieldLocationBlocked`, GpsCompliance probes; workday can remain “active” locally |
| No location fix | Updates skipped; **no fabricated coordinates** (good) |
| Poor accuracy | Visit form enforces gates; route config has `ROUTE_MAX_ACCURACY_METERS=100` but poor points may still be uploaded |
| Background / lock | Depends on background permission + Expo task; OEM battery savers need device QA |
| Missing period | **Not recorded** as an explicit gap event for backend reporting |
| App restart with cached workday | Local workday restored; tracking loops resume; server re-sync attempted |
| “No internet” vs “no GPS” | Partially separated in UI; some messages reuse generic tracking sync error |

**Sampling (when tracking runs):** ~40 m / ~22.5 s moving, ~90 s stopped, keepalive ~120 s (`trackingConfig.ts`, `shouldSendLocation.ts`). Queue cap **200** points (oldest dropped).

---

## 4. Current auto-sync behavior

**Automatic synchronization exists** (not manual-only).

### Sync-trigger table

| Trigger | Visits | GPS | Photos | Notifications | Failure handling |
| ------- | ------ | --- | ------ | ------------- | ---------------- |
| App bootstrap + online (`initOfflineSync`) | Yes `syncAll` | Yes | Yes (evidence + visit attachments) | Counts via `useSyncStore` | Single-flight `syncAllInFlight` |
| NetInfo reconnect | Yes | Yes | Yes | Same | Same |
| OfflineSyncContext (`online && pendingCount`) | Yes | Via `syncAll` | Via `syncAll` | `lastSyncFailed` | Auto re-entry when pending remains |
| AppState → active (`TrackingContext`) | No (GPS path) | Yes flush | No | Pending GPS count | Best-effort |
| 45s interval (while JS alive) | No | Yes `autoFlushPendingGps` | No | — | Online check first |
| Debounce after GPS enqueue (~1.5s) | No | Yes | No | — | — |
| Manual Sync (OfflineSyncScreen / banners / WorkVisitsPanel) | Yes | Yes (if syncAll) | Yes | User-visible | Shows failed counts |
| Visit submit (online) | Direct POST | N/A | Direct / evidence queue | Toast / navigation | Partial photo → evidence queue |
| Workday start | N/A | First point send/queue | N/A | Alerts on failure | API failure blocks start |
| Workday end / pre-sign-out | Flush visits | Flush then clear | Flush via visit flush | — | Clear GPS even if flush incomplete |
| Background location task | No | Append queue | No | Silent | Flush later |

**Backoff:** Visits use attempt counts (max 3), not exponential backoff. Workday server sync uses `[2000, 5000, 10000]` ms. GPS retries on next trigger.

**Concurrency:** `syncAllInFlight`, `locationUploadInFlight`, visit flush concurrency 3.

**One bad item:** Visit validation/non-network failures can mark that visit `failed` without blocking others. GPS duty mismatch clears **entire** GPS queue.

**Requires app open?** Largely yes for flush. Background location may still enqueue while OS allows.

---

## 5. What works

1. Offline visit enqueue with stable `local_sync_id` and server-side unique constraint.
2. Pending visits visible in Work / visits UI (“Pending sync” / “Saved offline”).
3. GPS continues to be captured without internet once duty is active; points land in MMKV.
4. Reconnect NetInfo triggers `syncAll()` (visits + GPS + evidence).
5. App restart restores cached active workday from SecureStore and pending visit/GPS JSON from MMKV.
6. Duplicate visit HTTP retries generally return existing visit (`duplicate: true`) instead of a second row.
7. Auth fast restore keeps the officer “logged in” offline for local work that doesn’t need the network.
8. Sync single-flight reduces double-storm uploads.

---

## 6. What is partial

1. Offline visits still require a **GPS fix** at submit time (offline ≠ GPS-free).
2. Farmer selection offline limited to **cached slice** (~50), not full roster.
3. Visit form mid-wizard is **Zustand-only** — process kill loses incomplete drafts.
4. Pending visits: **no edit/cancel UX** (remove APIs unused).
5. GPS accuracy / gap UX incomplete; route may include poor accuracy points.
6. Photo path: visit can survive retry via `local_sync_id`, but **media may duplicate** or fail after visit exists.
7. Dual connectivity (NetInfo vs API bus) can disagree briefly.
8. Backend duty bulk supports 207 + `failed_items`; mobile clears whole queue on non-throwing response.
9. Workday “cached / connecting” UX exists but officers may not understand server vs local truth.

---

## 7. What is broken / unsupported

1. **Offline Start Workday** — blocked; no queue.
2. **Logout / user switch** — pending MMKV data not cleared or scoped → can sync under another account.
3. **End workday / clearWorkdayState** — `clearLocationPushQueue()` discards unsynced route points.
4. **Duty session mismatch on GPS flush** — queue wiped (`locationSyncService.ts`).
5. **Photo durable persistence** — no copy to app documents; cache cleanup / restart risk.
6. **Photo server idempotency** — none; retries create duplicate `VisitMedia` / attachments.
7. **GPS client point IDs** — none; retries can duplicate or silently skip via server throttle.
8. **`GlobalOfflineBanner` / some compliance banners** — not mounted (dead UI paths).
9. **Workday HTTP start** — not idempotent (400 on double start; race can create two actives — app-level only).

---

## 8. Data-loss risks

| Risk | Severity | Mechanism |
|------|----------|-----------|
| GPS wiped on duty mismatch | **P0** | `flushOfflineLocationQueue` catch → `clearLocationPushQueue` |
| GPS wiped on end / teardown | **P0** | `clearWorkdayState` / `teardownTracking` |
| GPS dropped at 200-point cap | **P1** | Oldest discarded |
| Pending photos missing after restart | **P0** | URI in cache only |
| Visit stuck `failed` after 3 attempts | **P1** | Remains in MMKV; weak resolution UX |
| Incomplete visit form on kill | **P2** | No draft persistence |
| Master/farmer cache TTL / thin slice | **P1** | Wrong or missing farmer offline |

---

## 9. Duplicate risks

| Entity | Mobile | Backend | Verdict |
|--------|--------|---------|---------|
| Visit | `local_sync_id` dedupe in queue | Unique `(employee, local_sync_id)` + view check | **Safe** (race → 400 DATABASE_ERROR edge) |
| Workday / duty | Client avoids double start when local active | Start returns 400 if active; **no DB unique** | **Unsafe under race** |
| GPS points | Clear-all after flush | Duty bulk: throttle; **no client id**; legacy bulk-push worse | **Partial / unsafe on retry** |
| Photos | Re-upload same files | Always insert | **Unsafe** |

---

## 10. App-restart behavior

| Event | Visits queue | GPS queue | Photos | Workday | Auth |
|-------|--------------|-----------|--------|---------|------|
| Normal close | Preserved (MMKV) | Preserved | URI-dependent | SecureStore cache | Tokens SecureStore |
| Force stop | Same | Same | **At risk** | Same | Same |
| Phone reboot | Same | Same | **At risk** | Same | Same |
| App update | Usually preserved | Usually preserved | **At risk** | Same | Same |
| Logout | **Preserved (bug)** | Cleared only if teardown ran flush/clear | Evidence may remain | Cleared | Cleared |
| Login other user | **May sync prior user data** | Same | Same | New session | New tokens |

---

## 11. Photo reliability

**Classification: High risk**

Trace:

```text
Camera/gallery → compress (manipulator cache URI)
→ visitFormStore / __pending_attachments
→ MMKV visit or evidence queue (URI string only)
→ upload media/attachments endpoints
→ on failure: retry same URI / evidence queue
→ backend: new VisitMedia row every time
```

Issues:

- No durable copy into `FileSystem.documentDirectory`.
- OS/cache cleanup can invalidate URIs after restart.
- Successful visit + failed photos can leave orphan server visit without media until evidence flush.
- Partial photo success + retry → **duplicate media** on server.
- Max evidence attempts retain rows for diagnostics without clear officer remediation.

---

## 12. User-facing offline UX gaps

| Need | Present? | Notes |
|------|----------|-------|
| Offline banner | Partial | Several banners; `GlobalOfflineBanner` unused; `GlobalStatusStrip` mounted |
| Pending sync count | Yes | Visits emphasized; GPS often “automatic” / hidden |
| Sync progress | Partial | OfflineSyncScreen / progress callbacks |
| Sync success | Partial | Counts / last synced |
| Sync failure / per-item | Partial | Failed visits; weak photo/GPS failure storytelling |
| Retry button | Yes | Manual sync surfaces |
| Last successful sync | Partial | `lastSyncedAt` / last GPS sync key |
| GPS unavailable warning | Partial | Alerts + `fieldLocationBlocked` |
| Tracking interrupted warning | Weak | No explicit “gap in route” message |
| Pending photo warning | Weak | Not first-class in employee UX |
| Plain language | Mixed | “Saved offline” / “Pending sync” good; some technical/network conflation |

Officers may not reliably distinguish: **saved on device** vs **waiting to sync** vs **failed permanently** vs **synced**.

---

## 13. Backend compatibility

### Visits — `POST /api/v1/mobile/visits/`

- Idempotent with `local_sync_id` (view + serializer + partial unique index).
- Media in same request or follow-up; media failure after create is a known split-brain.
- Race on concurrent create → IntegrityError → generic DATABASE_ERROR (not duplicate envelope).

### GPS — `POST /api/v1/tracking/location/bulk/` (mobile canonical)

- Requires **active DutySession**.
- Per-point atomic; returns success/fail counts + `failed_items`.
- No client point UUID; route throttle can skip duplicates-ish but live location still updates.
- **Do not use** `location/bulk-push/` for offline retry (no dedup).

### Workday / duty start/end

- Not HTTP-idempotent; second start → 400.
- Application-level “already active” only; concurrent starts can create two actives.

### Photos

- No sync id / hash; retries duplicate.

### Farmers

- No delta sync API; mobile caches thin snapshot.

### Device session / auth

- `X-Device-Session` on employee writes; 409 SESSION_REPLACED.
- Refresh does not validate device session.
- Access ~12h / refresh ~7d (settings).

### Ordering expectations

Ideal:

```text
Duty start (online)
→ GPS points (duty id)
→ Visit (+ local_sync_id)
→ Photos (server visit id)
→ Duty end (after GPS flush)
```

Actual mobile `syncAll` runs visits / GPS / evidence **in parallel** — usually OK because visits don’t require active duty, but GPS **does**. Ending duty before GPS flush is a loss path.

---

## 14. P0 / P1 / P2 recommendations

### P0 — before any real field rollout

1. **Never discard GPS queue** on end/teardown/mismatch without persisting failures or forcing a successful flush + user warning.
2. **Scope or wipe queues on logout**; block logout when pending > 0 unless explicit discard.
3. **Copy pending photos** to durable storage; store durable URIs in the queue.
4. **Parse GPS bulk 207 / `failed_items`**; only remove acknowledged points.
5. **Do not claim offline Start Workday** until a queued/idempotent start exists — keep current block but make UX explicit: “Connect once to start your day.”

### P1 — harden daily field use

6. Photo upload client keys + backend unique (or content hash) to prevent duplicates.
7. Client GPS point UUIDs + backend unique on `(duty_session, client_point_id)`.
8. Expand offline farmer cache or dedicated sync pack.
9. Persist visit form drafts.
10. Pending visit cancel/edit + failed-item remediation UI.
11. Idempotent duty start (“return existing”) + DB guard on one active session.
12. Record GPS-outage gaps for reporting.

### P2 — polish

13. Unify NetInfo + connectivityBus.
14. Mount consistent offline/GPS banners; remove dead components or wire them.
15. Exponential backoff for visit/GPS retries.
16. Per-user MMKV namespaces.
17. Align docs (`MOBILE_API_SYNC_LIST.md`) with duty + device session reality.

---

## 15. Exact implementation order

1. GPS queue safety (no silent wipe; partial ack)  
2. Logout / multi-user queue isolation  
3. Durable photo files + photo dedup contract  
4. Explicit offline Start Workday product decision (block UX vs true offline start)  
5. Farmer offline pack  
6. Visit draft + pending edit/cancel  
7. Duty start idempotency (server)  
8. Gap recording + UX copy pass  
9. Device QA matrix execution (`OFFLINE_GPS_SYNC_TEST_MATRIX.md`)

---

## 16. Final verdict

### **Partial offline support — internal QA only**

**Not** production-ready for unsupervised full-day offline field work.  
**Not** “unsafe with zero offline value” — visit queue + GPS buffer + auto-sync are real.  

Safe **limited** internal QA only when:

- Workday is started **online**,
- Same user stays logged in,
- Officers verify pending sync before logout/end day,
- Photo and long offline GPS scenarios are treated as known fragile areas.

---

## Appendix A — Start Workday offline audit (detail)

```text
User taps Start Workday
→ ensureWorkAllowed (GPS compliance)
→ ensureTrackingPermissions
→ getForegroundLocation (GPS required)
→ ensureActiveWorkday / duty start (NETWORK required)
→ saveDutySessionFromWorkday (SecureStore)
→ start background location
→ TrackingContext applies UI
```

| Case | Behavior | Support |
|------|----------|---------|
| A — Internet available | Normal start | Supported |
| B — Offline before start | API fail → alert; **no** local workday; **no** queue | **Unsupported** |
| C — Drop during start | Fail closed; no local active unless API succeeded; duplicate start → 400 if first succeeded | Partial / race risk |
| D — Restart offline after successful start | Cached workday restored; `workdaySyncStatus: "cached"`; tracking can resume locally | **Partial** (restore yes; server unconfirmed) |

---

## Appendix B — Visit offline audit (detail)

```text
Farmer → form → GPS → photos → submit
→ online? submitVisitFromStore : enqueuePendingVisit(local_sync_id)
→ MMKV pending_visits_v1
→ syncAll / flushVisitQueue → POST mobile/visits/
→ upload attachments
→ remove queue row on success/duplicate
```

- Validation runs before enqueue/flush (`validateVisitSubmitValues`).
- History: pending section yes; edit/cancel no.
- Double submit guarded in-session via `submitInFlightRef` + stable `localSyncIdRef`.

---

## Appendix C — Physical device testing still required

Airplane mode GPS, OEM background kill, photo URI after force-stop, 207 partial bulk, session-replaced mid-queue, and two-user shared device must be executed on hardware before raising the verdict above **Safe for limited offline client QA** or higher.

---

*End of audit. No application code was changed.*
