# Android Release Crash Test Checklist

Use with a **release/debug APK** built from the stabilization branch — not Expo Go alone.

Record device model, Android version, APK commit hash, and attach logcat for any failure.

## Setup

- [ ] Install platform-tools; `adb devices` shows device
- [ ] `adb logcat -c` before each failure repro
- [ ] Uninstall old APK; install fresh artifact
- [ ] Note commit: `git rev-parse --short HEAD`

## Matrix (25 steps)

| # | Action | Expected | Pass | Logcat file | Notes |
|---|--------|----------|------|-------------|-------|
| 1 | Cold start | Splash zoom in/out, no crash | | | |
| 2 | Login | Home/Today loads | | | |
| 3 | Today tab | Stats, logo, no black bar | | | |
| 4 | Start Workday | In-app permission only; no Settings auto-open | | | |
| 5 | Farmers (Work queue) | List loads | | | |
| 6 | Farmer detail | Profile loads | | | |
| 7 | FAB New Visit | Visit step 1 | | | |
| 8 | Camera (visit step 3) | Camera opens or inline denial | | | |
| 9 | Visit submit (online) | Success screen | | | |
| 10 | Day tab | Stays in app; summary loads | | | |
| 11 | My Route | Map screen opens | | | |
| 12 | Notifications | List loads | | | |
| 13 | Notification → visit row | Visit detail opens | | | |
| 14 | Profile | Loads | | | |
| 15 | Diagnostics | Loads; no crash | | | |
| 16 | Sync status | Opens from Today | | | |
| 17 | End Workday | Ends cleanly | | | |
| 18 | Logout | Returns to login/splash | | | |
| 19 | Offline: open Work | No crash | | | |
| 20 | GPS off: Start Workday | Inline message; no crash | | | |
| 21 | Permission denied | Inline message; no auto Settings | | | |
| 22 | Background/resume | State restored | | | |
| 23 | Remove from Recents → reopen | No crash | | | |
| 24 | Tamil language | No missing-key crash | | | |
| 25 | Large font | Layout usable; no crash | | | |

## Evidence fields (copy per failure)

```
ID:
Screen/action:
Device:
Android:
APK commit:
Workday active:
GPS permission:
Network:
Cold/resume:
Timestamp:
Crash type: (FATAL / ReactNativeJS / UX-exit)
Stack summary:
```

See `scripts/capture-android-crash-log.md` for adb commands.
