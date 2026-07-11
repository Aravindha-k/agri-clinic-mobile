# Offline / GPS Sync — Physical Device QA Plan

**Product:** Kavya Agri Clinic  
**Date:** 2026-07-11  
**Repos:** Mobile `d:\agri-clinic-mobile` · Backend `d:\agri_clinic`  
**Prerequisite:** Document current **Result** as Untested; update after each run.  
**Decision baseline:** `OFFLINE_FIELD_WORKFLOW_DECISION.md`  
**Code matrix:** `OFFLINE_GPS_SYNC_TEST_MATRIX.md`

---

## QA environment

| Item | Requirement |
|------|-------------|
| Device | Physical **Android** phone (primary field platform); optional iOS spot-check |
| Build | Release or dev client with `npx expo start` — not Expo Go for GPS background |
| Account | Dedicated field-test employee; avoid production farmer PII in screenshots |
| Backend | Staging or dev API with DB access for verification |
| Tools | Airplane mode, Developer options (mock location **off** for real GPS tests), ADB logcat optional |
| Evidence | Screenshots + screen recording + server DB query output + MMKV export if debug build |

### Server verification queries (examples)

```sql
-- Visits
SELECT id, local_sync_id, employee_id, visit_date, created_at
FROM visits_visit WHERE employee_id = ? ORDER BY id DESC LIMIT 10;

-- GPS route
SELECT id, duty_session_id, latitude, longitude, captured_at
FROM tracking_employeeroutepoint WHERE duty_session_id = ? ORDER BY captured_at;

-- Photos
SELECT id, visit_id, file, created_at FROM visits_visitmedia WHERE visit_id = ?;
```

### Local verification (debug builds)

- Log tags: `[offlineSync]`, `trackingDevLog` events (`sent_to_backend`, `queued_offline`, `offline_flush`)
- MMKV keys: `pending_visits_v1`, `pending_gps_v1`, `pending_visit_evidence_v1`
- SecureStore: `agri_active_workday_v1`

---

## Pass / fail criteria

| Severity | Rule |
|----------|------|
| **Critical fail** | Data loss, cross-user sync, duplicate visit rows, fabricated GPS |
| **High fail** | Queue cleared without server ack, photos missing after restart, logout with pending silently succeeds |
| **Pass** | UI matches expected; local queue matches; server state correct; no duplicates |

---

## Test scenarios

### 1. Start online, lose internet, record GPS

| Field | Detail |
|-------|--------|
| **Setup** | Online; GPS on; permissions granted; no active workday |
| **Steps** | 1. Login 2. Start workday 3. Confirm tracking active 4. Enable airplane mode (GPS stays on) 5. Walk/drive 2–5 min 6. Open Day/Tracking tab |
| **Expected UI** | Workday remains active; offline banner; route or last point updates locally |
| **Expected local queue** | `pending_gps_v1` length > 0; workday cache in SecureStore |
| **Expected backend** | Duty session active; live points may have arrived before airplane mode |
| **Evidence** | Screenshot offline banner; `pending_gps_v1` count; map of local points |

---

### 2. Submit visit offline

| Field | Detail |
|-------|--------|
| **Setup** | Active workday from Test 1; airplane mode; farmer in offline cache |
| **Steps** | 1. New visit 2. Select cached farmer 3. Complete form with valid GPS 4. Submit |
| **Expected UI** | Success / “Saved offline”; visit in Work → Visits “PENDING SYNC” |
| **Expected local queue** | `pending_visits_v1` +1 with unique `local_sync_id` |
| **Expected backend** | No new visit row yet |
| **Evidence** | Pending section screenshot; queue JSON redacting PII |

---

### 3. Capture photos offline

| Field | Detail |
|-------|--------|
| **Setup** | Continue Test 2 or new offline visit |
| **Steps** | 1. Add 2 camera photos on visit step 3 2. Submit visit offline |
| **Expected UI** | Thumbnails visible before submit; pending visit shows photo count if surfaced |
| **Expected local queue** | `__pending_attachments` with file URIs in visit payload |
| **Expected backend** | No media rows |
| **Evidence** | Photo thumbnails screenshot; URI paths in debug log (**note if cache path**) |

**P0 gate:** After Test 5, photos must still upload — fail if URIs broken.

---

### 4. Force-close before sync

| Field | Detail |
|-------|--------|
| **Setup** | Pending visits + GPS from Tests 1–3; still offline |
| **Steps** | 1. Force-stop app from Android settings 2. Wait 30s 3. Reopen app (still offline) |
| **Expected UI** | Workday restored; pending counts visible |
| **Expected local queue** | Same visit + GPS counts as before force-stop |
| **Expected backend** | Unchanged |
| **Evidence** | Before/after queue counts; workday active screenshot |

---

### 5. Restart offline (cold start)

| Field | Detail |
|-------|--------|
| **Setup** | Same as Test 4 |
| **Steps** | 1. Kill app 2. Cold start while offline 3. Navigate Work + Day tabs |
| **Expected UI** | Login restored; workday active; pending sync indicators |
| **Expected local queue** | MMKV queues intact; photos readable if P0 durable storage shipped |
| **Expected backend** | Unchanged |
| **Evidence** | Full screen recording of cold start |

---

### 6. Reconnect and auto-sync

| Field | Detail |
|-------|--------|
| **Setup** | Pending data from Tests 1–5 |
| **Steps** | 1. Disable airplane mode 2. Wait for auto-sync (or tap Sync Now) 3. Observe progress |
| **Expected UI** | “Syncing field data…” then pending counts → 0 |
| **Expected local queue** | Visits cleared; GPS cleared only after ack (**P0:** partial failures retained) |
| **Expected backend** | Visit rows with matching `local_sync_id`; GPS points on duty session; photos attached |
| **Evidence** | Sync UI recording; SQL output; `last_gps_sync_v1` timestamp |

---

### 7. GPS off during workday

| Field | Detail |
|-------|--------|
| **Setup** | Online or offline; active workday |
| **Steps** | 1. Turn off device Location 2. Wait 2 min 3. Attempt new visit submit |
| **Expected UI** | GPS lost warning; workday **still active**; visit submit blocked at GPS gate |
| **Expected local queue** | No new GPS points while off |
| **Expected backend** | No fabricated points |
| **Evidence** | Warning screenshot; blocked submit message |

---

### 8. GPS restore

| Field | Detail |
|-------|--------|
| **Setup** | Continue Test 7 |
| **Steps** | 1. Re-enable Location 2. Wait for fix 3. Observe tracking |
| **Expected UI** | “Location tracking resumed” (or equivalent); points recording again |
| **Expected local queue** | New GPS entries after resume |
| **Expected backend** | Points arrive on next flush (gap may exist — document) |
| **Evidence** | Before/after point timestamps |

---

### 9. End workday offline

| Field | Detail |
|-------|--------|
| **Setup** | Active workday; pending GPS (do not fully sync); airplane mode |
| **Steps** | 1. Tap End Workday 2. Confirm |
| **Expected UI (target)** | “Workday ended on device — pending sync”; GPS queue **retained** |
| **Expected UI (current — known bug)** | May clear GPS queue — **document as fail** |
| **Expected local queue** | GPS + any pending visits retained until sync |
| **Expected backend** | Duty may still show active until sync |
| **Evidence** | Queue count before/after end; server duty status |

**Primary regression for P0 fix:** `TrackingContext.clearWorkdayState` must not wipe GPS.

---

### 10. Partial GPS batch failure

| Field | Detail |
|-------|--------|
| **Setup** | Staging backend or mock: bulk 207 with `failed_items`; or inject invalid point in queue (debug) |
| **Steps** | 1. Queue 5+ GPS points 2. Trigger flush online 3. Observe queue after response |
| **Expected UI (target)** | Partial failure message; some points still pending |
| **Expected local queue** | Failed indices retained with error |
| **Expected backend** | `success_count` + `failed_count` match; only valid points stored |
| **Evidence** | API response log; queue length before/after |

**Current expected result:** **Fail** — entire queue cleared on HTTP 207.

---

### 11. Photo upload failure

| Field | Detail |
|-------|--------|
| **Setup** | Online visit created; simulate media API failure (network proxy or staging fault) |
| **Steps** | 1. Submit visit with 2 photos 2. Cause media upload to fail after visit create |
| **Expected UI** | Visit saved; photos pending retry |
| **Expected local queue** | `pending_visit_evidence_v1` entry |
| **Expected backend** | Visit row exists; 0 or partial media |
| **Evidence** | Evidence queue count; retry success on Sync Now |

**After P0 dedup:** Retry must not duplicate `VisitMedia` rows.

---

### 12. Token expiry during sync

| Field | Detail |
|-------|--------|
| **Setup** | Pending queue; shorten token TTL in staging or wait for expiry |
| **Steps** | 1. Invalidate access token mid-sync 2. Observe refresh + retry |
| **Expected UI** | Sync resumes or shows retry; no data loss |
| **Expected local queue** | Items remain pending if refresh fails |
| **Expected backend** | No duplicate visits after refresh |
| **Evidence** | Auth logs; queue persistence |

---

### 13. Device session invalidation

| Field | Detail |
|-------|--------|
| **Setup** | Pending queue on Device A |
| **Steps** | 1. Login same user on Device B (replaces session) 2. On Device A, trigger sync |
| **Expected UI** | Session replaced message; sign-in required |
| **Expected local queue** | **Preserved** for same user; not uploaded with invalid session |
| **Expected backend** | No writes with stale session |
| **Evidence** | 409 handling screenshot; queue still present after re-login |

---

### 14. Logout with pending data

| Field | Detail |
|-------|--------|
| **Setup** | Pending visits or GPS; same user |
| **Steps** | 1. Profile → Sign out |
| **Expected UI (target P0)** | Blocked with logout message; Sync Now / Stay Signed In |
| **Expected UI (current)** | **Fail** — logout succeeds; queues remain |
| **Expected local queue** | Unchanged when blocked; cleared only after explicit discard (P2) |
| **Expected backend** | No orphan uploads |
| **Evidence** | Dialog screenshot; queue keys after logout attempt |

---

### 15. Second user login on same device

| Field | Detail |
|-------|--------|
| **Setup** | User A pending queue (from Test 14 if logout incorrectly allowed, or debug inject) |
| **Steps** | 1. Login User B 2. Go online 3. Wait for auto-sync |
| **Expected UI (target P0)** | User A data not shown; User B sync only own data |
| **Expected UI (current)** | **Critical fail** — User A visits may upload under User B |
| **Expected local queue** | User A data quarantined or cleared on User B login |
| **Expected backend** | Visits attributed to correct employee only |
| **Evidence** | `employee_id` on synced visits; SQL |

---

### 16. Duplicate sync retry

| Field | Detail |
|-------|--------|
| **Setup** | One pending visit with known `local_sync_id` |
| **Steps** | 1. Sync successfully 2. Manually re-insert same payload (debug) or tap Sync twice rapidly |
| **Expected UI** | No duplicate pending row |
| **Expected backend** | Single visit; second POST returns `duplicate: true` |
| **Evidence** | API response; DB count for `local_sync_id` |

---

### 17. Phone reboot

| Field | Detail |
|-------|--------|
| **Setup** | Active workday + pending queues (offline) |
| **Steps** | 1. Reboot phone 2. Open app offline 3. Then online sync |
| **Expected UI** | Same as cold start + successful sync |
| **Expected local queue** | Survives reboot |
| **Expected backend** | Consistent after sync |
| **Evidence** | Queue counts post-reboot |

---

### 18. Low storage

| Field | Detail |
|-------|--------|
| **Setup** | Fill device storage to <5% free |
| **Steps** | 1. Capture visit photos 2. Queue GPS 3. Observe errors |
| **Expected UI** | Clear storage warning; no silent corruption |
| **Expected local queue** | Graceful failure; officer guidance |
| **Evidence** | Error screenshots; no crash |

---

### 19. Cache cleanup simulation

| Field | Detail |
|-------|--------|
| **Setup** | Pending visit with photos (cache URIs — pre-P0) |
| **Steps** | 1. Android Settings → App → Clear cache (not clear data) 2. Reopen app 3. Attempt sync |
| **Expected UI (pre-P0)** | Photo upload fail; visit may remain |
| **Expected UI (post-P0)** | Photos still upload from documentDirectory |
| **Evidence** | Upload success/fail logs |

---

### 20. App update with pending queue

| Field | Detail |
|-------|--------|
| **Setup** | Pending visits + GPS on installed build N |
| **Steps** | 1. Install build N+1 over existing 2. Open app 3. Sync |
| **Expected UI** | Migration reads legacy keys; pending counts correct |
| **Expected local queue** | `migrateLegacyQueues()` succeeds |
| **Expected backend** | Data syncs after update |
| **Evidence** | Version numbers; queue migration log |

---

## Execution checklist

| # | Scenario | Tester | Date | Result | Notes |
|---|----------|--------|------|--------|-------|
| 1 | Start online, lose internet, GPS | | | Untested | |
| 2 | Submit visit offline | | | Untested | |
| 3 | Capture photos offline | | | Untested | |
| 4 | Force-close before sync | | | Untested | |
| 5 | Restart offline | | | Untested | |
| 6 | Reconnect auto-sync | | | Untested | |
| 7 | GPS off during workday | | | Untested | |
| 8 | GPS restore | | | Untested | |
| 9 | End workday offline | | | Untested | Known GPS wipe bug |
| 10 | Partial GPS batch failure | | | Untested | Known fail |
| 11 | Photo upload failure | | | Untested | |
| 12 | Token expiry during sync | | | Untested | |
| 13 | Device session invalidation | | | Untested | |
| 14 | Logout with pending data | | | Untested | Known fail |
| 15 | Second user same device | | | Untested | Known critical |
| 16 | Duplicate sync retry | | | Untested | |
| 17 | Phone reboot | | | Untested | |
| 18 | Low storage | | | Untested | |
| 19 | Cache cleanup simulation | | | Untested | |
| 20 | App update with queue | | | Untested | |

---

## Automatic sync lifecycle matrix (2026-07-11)

Record for every scenario: queue before, app state, network, worker scheduled, worker execution timestamp, backend result, queue after, UI after reopen, pass/fail, evidence.

| # | Scenario | Expected |
|---|----------|----------|
| 1 | App open, network reconnects | Coordinator runs within seconds; queues drain |
| 2 | App minimized, network reconnects | Sync when JS/OS allows; may defer |
| 3 | Removed from Recents, network reconnects | WorkManager may run (≥15min typical) |
| 4 | Process killed (memory pressure) | Worker retries when OS schedules |
| 5 | Device reboot, pending queues | Sync on next authenticated launch |
| 6 | Settings → Force stop | **No sync** until app reopened |
| 7 | Reopen after Force stop | Immediate sync after auth restore |
| 8 | Battery Saver enabled | Deferred but eventual sync |
| 9 | Background activity restricted | Deferred; document OEM behavior |
| 10 | Manufacturer battery optimization | Deferred; whitelist may be required |
| 11 | Wi-Fi → mobile data | Sync continues if online |
| 12 | Mobile data → Wi-Fi | Sync continues if online |
| 13 | Flapping network | Debounced reconnect; no duplicate workers |
| 14 | Pending photos, minimized | Photos flush after visits in order |
| 15 | Pending GPS, minimized | GPS uploads via coordinator |
| 16 | Pending End Workday, minimized | Workday end after visits/GPS |
| 17 | Token expires during worker | Refresh or auth_required; queue preserved |
| 18 | Device session revoked | auth_required; queue preserved |
| 19 | User disabled during worker | auth_required; queue preserved |
| 20 | All queues empty | Worker cancelled; health = Synced |

**Do not mark minimized/killed-app sync as Pass from code inspection alone.**

---

## Verdict gates

| Milestone | Required tests | Minimum pass rate |
|-----------|----------------|-------------------|
| Internal QA (current) | 1–6 with known limitations | Document failures; no production |
| After P0 fixes | 1–11, 14–16 all Pass | 100% on Critical/High |
| Limited client QA | Full 1–20 | 100% Critical; ≥90% overall |
| Production offline | Full 1–20 + 3-day field pilot | Zero data-loss incidents |

---

## Reporting template (per test)

```markdown
### Test N: [title]
- **Device:** [model / Android version]
- **Build:** [version / commit]
- **Result:** Pass | Fail | Partial
- **UI:** [observed]
- **Local queue:** [counts / keys]
- **Backend:** [SQL / admin screenshot]
- **Evidence:** [links / attachments]
- **Defects filed:** [ticket ids]
```

---

*This plan is executable on physical hardware. Update `OFFLINE_GPS_SYNC_TEST_MATRIX.md` Result column as tests complete.*
