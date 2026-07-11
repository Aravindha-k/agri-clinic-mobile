# Automatic Offline Sync — Implementation Report

**Date:** 2026-07-11  
**Mobile:** `d:\agri-clinic-mobile`  
**Backend:** `d:\agri_clinic`  
**Verdict:** **Ready for internal automatic-sync QA**

---

## 1. Previous sync behavior

| Trigger | App open | Minimized | Force-killed | Auth restore | Queues |
|---------|:--------:|:---------:|:------------:|:------------:|--------|
| `initOfflineSync` NetInfo | Yes | No* | No | Partial | Visits, GPS, photos, workday end |
| `OfflineSyncContext` auto | Yes | No* | No | After login | Visits only |
| `TrackingContext` AppState | Yes | Partial | No | Yes | GPS flush |
| 45s GPS interval | Yes | No* | No | Yes | GPS only |
| Manual Sync UI | Yes | Yes | No | Yes | All |
| Background location task | Partial | Partial | Partial | N/A | GPS enqueue only |

\*Requires JavaScript runtime alive.

Field officers saw **Sync now** on Home, Profile, Offline Sync, Work visits, and banners. Background upload after process death was **not implemented**.

---

## 2. New automatic triggers

Central entry point: `runAutomaticSync(trigger)` in `mobile/lib/sync/automaticSyncCoordinator.ts`.

| Trigger | When |
|---------|------|
| `app_start` | App bootstrap when online |
| `authentication_restored` | Session validation completes |
| `app_foreground` | AppState active |
| `network_reconnected` | NetInfo offline to online (debounced) |
| `visit_queued` / `workday_end_queued` | Queue transitions |
| `periodic_foreground` | GPS enqueue / interval |
| `android_background_worker` | expo-background-task WorkManager |
| `diagnostics_retry` | Support-only retry |

---

## 3–7. Runtime behavior summary

- **Foreground:** Auth + device session + network gates; ordered sync; bounded retry backoff.
- **Minimized:** Same coordinator when JS alive; OS may suspend.
- **Removed from Recents:** WorkManager may run later (not immediate).
- **Force stop:** No background work until user reopens app.
- **Reboot:** Queues persist; sync on next authenticated launch.

---

## 8. Background worker

- `expo-background-task` + `KAVYA_FIELD_DATA_SYNC` task
- Handler calls shared `runAutomaticSync("android_background_worker")`
- User id persisted for ownership checks
- Requires new native Android build

---

## 9–11. Auth, ownership, retry

SecureStore tokens; queues preserved on auth failure; user-scoped MMKV; foreground 0/15s/60s/5m backoff; WorkManager ≥15min.

---

## 12–13. UX

Manual Sync removed from normal flows. `SyncHealthIndicator` on Today; read-only `SyncStatus` screen. Diagnostics retains retry.

---

## 17. Automated tests

| Check | Result |
|-------|--------|
| typecheck | Pass |
| test:offline | Pass (5) |
| expo-doctor | 17/18 |
| manage.py check | Pass |
| manage.py test | Blocked (no PostgreSQL) |

---

## 18. Physical-device evidence

Not collected this session. Required before production verdict.

---

## 20. Final verdict

**Ready for internal automatic-sync QA** — not production-ready until device matrix passes on fresh APK.
