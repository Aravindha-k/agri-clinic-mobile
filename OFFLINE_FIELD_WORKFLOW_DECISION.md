# Offline Field Workflow — Version 1.0 Decision Document

**Product:** Kavya Agri Clinic  
**Date:** 2026-07-11  
**Repos:** Mobile `d:\agri-clinic-mobile` · Backend `d:\agri_clinic`  
**Method:** Code-path audit + architecture review (no code changes)  
**Companion docs:** `OFFLINE_SYNC_ARCHITECTURE.md`, `OFFLINE_GPS_AUTO_SYNC_COMPLETE_AUDIT.md`, `OFFLINE_GPS_SYNC_TEST_MATRIX.md`, `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md`, `OFFLINE_GPS_SYNC_DEVICE_QA_PLAN.md`

---

## Executive summary

Kavya Agri Clinic has **partial offline support** suitable for **internal QA only**. Visit queuing, GPS buffering after an online workday start, and auto-sync on reconnect are real — but data-loss paths, cross-user queue risk, and photo fragility block production field use.

**Version 1.0 offline Start Workday:** **Not included** — online start remains required (Option A).  
**Version 1.0 offline End Workday:** **Saved locally and synced later** (target behavior; current implementation is unsafe).  
**Logout with pending data:** **Must be blocked** until P0 fixes ship.

---

## 1. Supported offline product behavior (Version 1.0 target)

Classification key:

| Symbol | Meaning |
|--------|---------|
| **FS** | Fully supported offline |
| **SL** | Saved locally and synced later |
| **RO** | Read-only from cached data |
| **RN** | Requires network |
| **BLK** | Must be blocked with explanation |

### Feature matrix — intended V1.0 behavior

| Feature | Online | Offline | GPS unavailable | Reconnect behavior |
| ------- | ------ | ------- | --------------- | ------------------ |
| **Login** | Normal JWT + device session | **RN** — first login needs network | N/A | N/A |
| **Restore existing login** | Validate employee profile | **FS** — tokens + device session from SecureStore (`AuthContext.runFastLocalBootstrap`) | N/A | Background validate when online |
| **Start Workday** | `POST tracking/duty/start/` | **RN / BLK** — see §3 | **BLK** if compliance gate fails — GPS fix required before start (`workday.ts`, `location.ts`) | N/A until online |
| **End Workday** | `POST tracking/duty/end/` + flush | **SL** — local end state + queue end op (target); current code clears GPS unsafely | Final point skipped if no fix; workday still endable | Flush visits → photos → GPS → workday end |
| **Farmer list** | `GET mobile/farmers/` paginated | **RO** — first ~50 farmers from `@agri/master_data_v2` (`masterDataCache.ts`) | N/A | Refresh full list |
| **Farmer search** | Server search | **RO** — search within cached slice only; **BLK** for uncached farmers with message | N/A | Full search when online |
| **Farmer details** | `GET mobile/farmers/{id}/` | **RO** if farmer in cache; else **RN** | N/A | Fetch and cache |
| **Create farmer** | `POST mobile/farmers/` | **RN** — not queued today | N/A | N/A |
| **Edit farmer** | `PATCH mobile/farmers/{id}/` | **RN** | N/A | N/A |
| **Create visit** | Direct `POST mobile/visits/` | **SL** — `enqueuePendingVisit` → `pending_visits_v1` | **BLK** at submit — visit requires GPS fix (`visitValidation.ts`) | Auto `runAutomaticSync()` — no manual Sync for field officers |
| **Add visit photos** | Upload with visit or evidence queue | **SL** — URIs in `__pending_attachments` (fragile until P0 durable copy) | Same as offline if visit creatable | Retry via `flushVisitQueue` / `pendingEvidenceQueue` |
| **Submit visit** | Online POST | **SL** — queued with `local_sync_id` | **BLK** without GPS fix at submit | Idempotent sync via `local_sync_id` |
| **GPS tracking** | Live `POST tracking/location/update/` | **SL** after online duty start — `pending_gps_v1` | Points not recorded; workday stays active; warn user | `flushOfflineLocationQueue()` |
| **View route** | Server route + local points | **RO** — last known + unsynced local buffer | Show gap; no fabricated coords | Merge after GPS sync |
| **Notifications** | `GET` live | **RO** — last fetched counts if any; else stale/empty | N/A | Refresh |
| **Profile** | Live employee data | **RO** — cached employee from auth bootstrap | N/A | Refresh when online |
| **Logout** | Normal sign-out | **BLK** if unsynced field data exists (target P0) | Same | Allow after successful sync |

### Version 1.0 scope statement

**Supported offline (after P0 fixes, with online workday start):**

- Continue active workday without internet
- Buffer GPS points locally (cap 200)
- Create and submit visits offline (with GPS at submit time)
- Attach photos offline (after durable storage fix)
- Auto-sync on reconnect, startup (if online), and manual Sync Now
- Restore login, workday cache, and pending queues after app restart

**Remains online-only in V1.0:**

- First login
- Start Workday
- Create / edit farmer
- Full farmer directory and server search
- Notifications refresh
- Server-confirmed workday end (until offline-end queue ships in P1)

**Explicit user promise (V1.0):**

> Connect once at the start of your day to begin work. After that, visits and your route are saved on this phone and will upload when internet returns. Photos and location data stay on the device until sync completes. Do not sign out or hand the phone to another officer until sync finishes.

---

## 2. Ideal full-day field scenario (summary)

Full step-by-step trace (UI, queues, API, failures) is in `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §2.

At a glance:

```text
Login online → Start workday online → lose internet → GPS buffers →
farmers from cache → 2 visits + photos offline → force-close →
reopen offline → workday + queues restored → GPS off (warn, no end) →
GPS on → resume → internet → syncAll (visits, photos, GPS) →
end workday → flush remaining → server ack → clear queues
```

**Current gaps in this scenario:** end-workday GPS wipe (`TrackingContext.clearWorkdayState`), photo URI loss, GPS partial-batch clear, logout/cross-user.

---

## 3. Offline Start Workday — decision

### Option A — Require online start (**chosen for V1.0**)

| Factor | Assessment |
|--------|------------|
| Backend | `DutyStartAPI` returns 400 `DUTY_ALREADY_STARTED`; no idempotent “return existing”; no DB unique on one active duty (`duty_service.py`) |
| Mobile | `startWorkday()` → `ensureActiveWorkday()` — no queue (`mobile/lib/workday.ts`) |
| GPS bulk | Requires active `DutySession` (`bulk_update_locations` in `duty_service.py`) |
| Implementation cost | Offline start needs local workday ID, start queue, server ID remap, visit/GPS association, duplicate-start guards — **high** |
| Field reality | Officers typically leave base with signal; blocking start offline is acceptable if messaging is clear |

### Option B — Offline start (**postponed to P1 evaluation**)

Required design is documented in `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §3. Not pursued for V1.0 due to repository complexity and backend non-idempotency.

### V1.0 user message (required copy)

**English (`fieldWorkflow.startWorkdayNeedsInternet`):**

> Internet is required to start your workday. Once started, visits and location can continue offline.

**Tamil (`fieldWorkflow.startWorkdayNeedsInternet`):**

> உங்கள் பணிநாளைத் தொடங்க இணையம் தேவை. தொடங்கிய பிறகு, விசிட்டுகள் மற்றும் இருப்பிடம் ஆஃப்லைனில் தொடரலாம்.

Current behavior already blocks API failure; UX must surface this message explicitly instead of generic “Unable to start work.”

---

## 4. GPS vs internet (summary)

Internet and GPS are **partially separated** today (`gpsState`, `fieldLocationBlocked`, `connectivityBus` vs NetInfo). V1.0 must treat them as independent axes — see implementation plan §4 for the full state table.

**Invariant:** The app must **never fabricate coordinates**.

---

## 5–12. Technical contracts

Detailed specifications:

| Topic | Document section |
|-------|------------------|
| Queue models + missing fields | `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §5 |
| Logout / ownership | `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §6 |
| Sync triggers | `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §7 |
| Sync ordering | `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §8 |
| GPS `failed_items` | `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §9 |
| Photo persistence + dedup | `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §10 |
| End workday fix | `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §11 |
| UX strings (en/ta keys) | `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md` §12 |

---

## 13. Required P0 fixes (before raising QA verdict)

| # | Fix | Root cause |
|---|-----|------------|
| 1 | Stop clearing GPS queue in `clearWorkdayState` / duty mismatch until ack | `TrackingContext.tsx:243`, `locationSyncService.ts:146–157` |
| 2 | Parse bulk 207 + `failed_items`; remove only accepted points | `flushOfflineLocationQueue()` clears all on non-throw |
| 3 | Add `user_id` (and device session) to all queue records; namespace or filter on sync | MMKV keys are device-global |
| 4 | Block logout when pending visits/GPS/photos > 0 | `performLocalSignOut` does not clear or check queues |
| 5 | Copy photos to `FileSystem.documentDirectory`; store durable URI | `visitPhotos.ts`, `__pending_attachments` cache URIs |
| 6 | Photo idempotency key + backend unique constraint | `MobileVisitMediaUploadAPI` always creates rows |

---

## 14. QA readiness

Executable device plan: `OFFLINE_GPS_SYNC_DEVICE_QA_PLAN.md` (20 scenarios).

**Can limited client offline QA begin now?** **No.**  
**Can internal offline QA begin now?** **Yes, with strict protocol** (online start, same user, no logout with pending, treat photos/GPS as fragile).

**After P0 fixes:** Ready for **internal offline QA after P0 fixes**.  
**After P0 + P1 (offline end, partial sync UI):** Ready for **limited offline client QA**.  
**Production-ready offline workflow:** Requires P0 + P1 + successful device matrix + photo/GPS dedup on server.

---

## 15. Final verdict

### **Ready for internal offline QA** (after code deploy — device matrix pending)

| Verdict level | Status |
|---------------|--------|
| Unsafe for offline field QA | Superseded for GPS/logout/photo P0 paths |
| Ready for internal offline QA after P0 fixes | **Current — code landed; run device QA** |
| Ready for limited offline client QA | After device QA + backend migration deploy |
| Production-ready offline workflow | Not achieved |

### Unsupported actions (do not promise in V1.0)

- Start workday without internet
- Full farmer roster offline
- Create/edit farmer offline
- Guaranteed photo survival without P0 durable storage
- Background visit/photo sync while app is force-stopped
- Silent logout with unsynced data

### Remaining production blockers

1. GPS queue deletion on end-workday and duty mismatch  
2. Cross-user queue sync on shared devices  
3. Photo cache URI durability and server duplicate media  
4. GPS partial-batch acknowledgement  
5. No offline workday start (product limitation, not blocker if messaging is clear)  
6. Thin offline farmer cache (~50)  
7. Physical-device validation of all 20 QA scenarios  

---

*This document is the authoritative V1.0 product decision. Implementation tasks are tracked in `OFFLINE_GPS_SYNC_IMPLEMENTATION_PLAN.md`.*
