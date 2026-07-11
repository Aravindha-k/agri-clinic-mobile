# Offline / GPS / Sync Test Matrix — Kavya Agri Clinic

**Audit date:** 2026-07-11  
**Method:** Code-path tracing (mobile + backend). Physical-device results marked **Untested** where runtime confirmation is required.  
**Result column:** Pass / Fail / Partial / Untested / N/A

| Scenario | Expected behavior | Current behavior (from code) | Risk | Result |
| -------- | ----------------- | ---------------------------- | ---- | ------ |
| Start workday online | Duty start API succeeds; SecureStore cache; GPS tracking starts | `startWorkday()` → `ensureActiveWorkday` → save session → background GPS | Low | Pass (logic) / Untested (device) |
| Start workday offline | Queue start or clear offline mode; no false “working” state | **Blocked**: API required (`reason: "api"`); Alert “Unable to start work”; no local start queue | High — cannot begin field day offline | Fail |
| Internet lost after start | Workday stays active locally; GPS continues; points queue | Cached workday + `usingCachedWorkday`; GPS queues via `appendLocationPush`; NetInfo later `syncAll` | Medium | Partial |
| GPS lost after start | Warn user; keep workday; no fabricated coords; resume when GPS returns | `gpsState` / `fieldLocationBlocked`; compliance probes; no gap timeline recorded; tracking skips when no fix | Medium–High | Partial |
| Internet restored | Auto sync visits + GPS + photos | NetInfo → `syncAll()`; OfflineSyncContext auto-sync for pending visits; 45s GPS timer | Low–Medium | Pass (logic) / Untested |
| GPS restored | Resume sampling without duplicate fabricated points | Foreground/background listeners resume when location available; movement filter applies | Low | Partial / Untested |
| Create visit offline | Save locally with `local_sync_id`; show pending | Offline/network error → `enqueuePendingVisit`; WorkVisitsPanel “PENDING SYNC” | Medium (needs GPS fix + farmer available) | Partial |
| Add photos offline | Persist files safely with visit | Photos as `__pending_attachments` URIs (cache/manipulator); **not copied to durable app docs** | High | Partial |
| Submit visit offline | User sees saved-on-device; queue pending | Enqueue + success UX; `localSyncIdRef` prevents double tap in session | Medium | Pass (logic) |
| App force-close before sync | Pending visits/GPS survive | MMKV persists; visit form Zustand draft **lost**; photo URIs may break if cache cleaned | High (photos) | Partial |
| App restart before sync | Restore queues; restore workday UI if cached | `readCachedActiveWorkday` + visit/GPS MMKV; tracking loops resume if workday active | Medium | Partial / Untested |
| Sync after reconnect | Upload once; ack clears pending | Visits: remove on 200/201/duplicate; GPS: clear entire queue on non-throw | Medium (GPS partial ack) | Partial |
| Partial visit sync failure | Visit remains pending; no silent drop | Network → pending; non-network after 3 attempts → `failed` stays in MMKV | Medium | Partial |
| Photo upload failure | Visit kept; photos retry without losing visit | Online: evidence queue; offline flush: photo fail throws → visit stays queued; retry uses `local_sync_id` duplicate | Medium–High (server photo dup) | Partial |
| GPS batch failure | Failed points remain queued | Bulk fail → per-point; duty mismatch → **wipe queue**; flush success clears all without parsing `failed_items` | High | Fail / Partial |
| Token expiry during sync | Refresh then retry; or keep pending | JWT refresh path exists; failed items stay pending on auth errors (attempts may burn) | Medium | Untested |
| Device-session invalid during sync | 409; re-login; pending data preserved for same user | Session teardown ends workday path; **queues not cleared on logout** | High (cross-user) | Fail (isolation) |
| Duplicate retry | No second visit/GPS/photo | Visits: `local_sync_id` + DB unique; GPS: no point id (possible dups / throttle skips); photos: **duplicate rows** | High (photos/GPS) | Partial |
| Logout with pending data | Warn + block or flush; never hand to another user | Pre-sign-out flushes GPS/visits best-effort; `performLocalSignOut` **does not clear** MMKV queues | Critical | Fail |
| Phone restart | Queues + workday cache restore | SecureStore + MMKV survive; background task depends on OS; photo files uncertain | Medium–High | Untested |
| Two users on same device | Queues scoped per user or wiped on logout | **Shared MMKV keys** — next login can sync prior user’s pending visits/GPS | Critical | Fail |
| End workday with pending GPS | Flush then end; retain failures | Best-effort flush then `clearWorkdayState` → **`clearLocationPushQueue`** | High | Fail |
| End workday offline | Queue end or keep local active until sync | `endDutySession` needs network; local clear still runs on success path / inactive messages; offline end is fragile | High | Fail / Partial |
| Farmer not in offline cache | Clear error; cannot invent farmer | Master cache holds ~50 farmers only; full directory needs network | High for rural lists | Partial |
| Poor GPS accuracy | Reject or flag; no silent bad points | Visit submit gates accuracy; route `ROUTE_MAX_ACCURACY_METERS` defined but poor route points may still send | Medium | Partial |
| App backgrounded during workday | Continue background location if permitted | Expo background task + foreground poll fallback; Android OEM restrictions apply | Medium | Untested |
| Concurrent sync jobs | Single flight; no double upload storms | `syncAllInFlight` + `locationUploadInFlight` locks | Low | Pass |
| Visit before workday on server | Attach by date / allow visit | Backend `attach_visit_duty_links` by visit_date; visit sync does not require active duty | Low–Medium | Partial |
| GPS without active duty | Reject or rebind | Bulk requires active duty; mismatch clears local queue | High | Fail (data loss path) |

---

## Device tests still required

These cannot be closed from code alone:

1. Android force-stop with pending photos — URI still readable after cold start?
2. OEM battery savers killing background location for a full day.
3. Airplane mode: GPS still returns fixes (expected yes) vs app messaging.
4. Duty bulk HTTP 207 with mixed `failed_items` — does mobile clear the whole queue?
5. Concurrent Start Workday double-tap race against backend (no DB unique on active workday).
6. Session replaced (second phone login) mid-queue — which user’s JWT uploads pending MMKV rows?

---

## How to use this matrix in QA

1. Prefer a physical Android device with location + airplane mode toggles.
2. For each row, capture screenshots of pending UI + server DB counts (`Visit.local_sync_id`, `LocationLog` / `EmployeeRoutePoint`, `VisitMedia`).
3. Mark Result from **Untested** → Pass/Fail after one successful run.
4. Any **Fail** in Critical/High risk blocks production field rollout.
