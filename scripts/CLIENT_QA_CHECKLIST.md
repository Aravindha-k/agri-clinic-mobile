# Kavya Agri Clinic — Client QA Checklist (v1.0.1)

APK: **Kavya_Agri_Clinic_Client_QA_v1.0.1.apk**  
Backend: `http://13.207.17.117/api/v1/`  
Min Android: **API 26 (Android 8.0 Oreo)**

## Devices & emulators

| Target | Status |
|--------|--------|
| Moto Edge 50 Pro | ☐ Pass ☐ Fail |
| Moto Edge 60 Pro | ☐ Pass ☐ Fail |
| Low-end Android phone | ☐ Pass ☐ Fail ☐ N/A |
| Emulator API 26 (Android 8) | ☐ Pass ☐ Fail |
| Emulator API 29 (Android 10) | ☐ Pass ☐ Fail |
| Emulator API 31 (Android 12) | ☐ Pass ☐ Fail |
| Emulator API 34 (Android 14) | ☐ Pass ☐ Fail |
| Emulator API 35 (Android 15) | ☐ Pass ☐ Fail |

## Network conditions

Test on Wi‑Fi, Jio mobile data, Airtel mobile data, slow network, offline, backend unreachable.

| Check | Status |
|-------|--------|
| Login over Wi‑Fi | ☐ |
| Login over mobile data | ☐ |
| Offline banner (no crash) | ☐ |
| API timeout shows error (no crash) | ☐ |
| Retry after reconnect | ☐ |

## Core flows (each device)

| Flow | Status |
|------|--------|
| Fresh install | ☐ |
| First launch / splash ≤ 3s | ☐ |
| Splash static fallback (if anim off) | ☐ |
| Login | ☐ |
| Logout | ☐ |
| Reopen app (session restore) | ☐ |
| Today dashboard | ☐ |
| Work queue | ☐ |
| **Farmer details (critical)** | ☐ |
| Create visit (FAB) | ☐ |
| Edit visit | ☐ |
| Photo capture | ☐ |
| Gallery upload | ☐ |
| GPS allow | ☐ |
| GPS deny (friendly, no crash) | ☐ |
| My Location | ☐ |
| Start / end workday | ☐ |
| Offline mode + sync | ☐ |
| Notifications permission (Android 13+) | ☐ |
| Back button | ☐ |
| Background / foreground | ☐ |
| Force-stop and reopen | ☐ |

## Error recovery

| Check | Status |
|-------|--------|
| Error screen: Retry | ☐ |
| Error screen: Go to Home | ☐ |
| Error screen: Logout | ☐ |

## QA logcat (internal APK, `EXPO_PUBLIC_QA_MODE=true`)

```powershell
adb logcat | findstr /i "QA Startup GlobalErrorHandler ScreenErrorBoundary"
```

Verify logs show `screen_open`, no unhandled `FATAL EXCEPTION`.

## Pass criteria

**Client-ready only when:**

- Zero crashes on Moto Edge 50 Pro and Moto Edge 60 Pro
- Farmer Details opens without crash on both Motos
- Splash completes or falls back within 3 seconds
- Emulator API 26 and API 35 both pass install + login + farmer details

## Capture crash logs

```powershell
adb logcat *:E
adb logcat | findstr /i "AndroidRuntime ReactNativeJS FATAL EXCEPTION"
```
