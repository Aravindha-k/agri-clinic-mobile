# Start Workday UX Report

**Latest:** In-app Android location-enable dialog (Swiggy/Zomato style)  
**Commit target:** `feat(mobile): prompt users to enable location in app`

---

## Previous GPS-off behavior

When device location was off, Start Workday showed an alert with **Open Location Settings**, which called `Linking.openSettings()` and left Kavya Agri Clinic for the full Settings app. Permission denial and GPS-off shared similar “open Settings” patterns.

## New GPS-off behavior

```text
Start Workday
→ request/check app location permission (runtime prompt)
→ if device location off → Android system Location Settings resolution dialog
   (Play services SettingsClient via expo-location)
→ user taps OK → services rechecked → Getting your location… → startDay()
→ user cancels → stay on Today/Day, inline message + Try Again (no Settings)
```

If the resolution dialog is unavailable (no Play Services / OEM), show a fallback alert with **Open Location Settings** (`LOCATION_SOURCE_SETTINGS` intent).

## Native integration selected

**Existing dependency:** `expo-location` `Location.enableNetworkProviderAsync()`

This already wraps:

- `LocationServices.getSettingsClient`
- `checkLocationSettings`
- `ResolvableApiException.startResolutionForResult`

No new package, no Expo SDK upgrade, no custom native module.

## Dependency or native module added

**None.** JS helpers only:

- `src/utils/ensureAndroidLocationServices.ts`
- Updated `src/utils/workdayLocationGate.ts`

## Expo Go limitation

- The dialog is implemented inside `expo-location`, which ships with Expo Go.
- In practice, validate on a **dev / QA APK** as well — OEM / Play Services behavior can differ from Expo Go.
- If resolution fails in Expo Go, the safe Settings fallback still works.

## APK rebuild requirement

**No new native code** → existing APKs that already include `expo-location` (~19.x) pick up this behavior with a JS reload / OTA.

A **fresh APK rebuild is recommended for QA sign-off** of the GPS-off flow, but not required to ship the JS change into an already-linked binary.

## Decision path (current)

```text
ensureLocationForWorkdayStart()
  ├─ gateInFlight? → busy
  ├─ App permission
  │    ├─ granted → continue
  │    ├─ can ask → requestForegroundPermissionsAsync
  │    └─ blocked → Alert + Linking.openSettings (app permissions)
  └─ Device location
       ├─ hasServicesEnabledAsync already true → ok
       ├─ Android enableNetworkProviderAsync → OK → recheck → ok
       ├─ cancelled → services_cancelled (inline Try Again)
       └─ unavailable/error → Alert + LOCATION_SOURCE_SETTINGS fallback
```

## Files changed

| File | Change |
|------|--------|
| `src/utils/ensureAndroidLocationServices.ts` | Typed Android location-services helper |
| `src/utils/workdayLocationGate.ts` | Permission → services flow; Settings only as fallback |
| `src/utils/workdayStartCopy.ts` | New copy keys |
| `mobile/app/(tabs)/index.tsx` | Typed gate + Getting location… + cancel inline error |
| `mobile/app/tracking.tsx` | Same |
| `mobile/components/workday/WorkdayStartPanel.tsx` | `startingLabel`, Try Again |
| `src/components/WorkdayInactiveBanner.tsx` | Typed gate result |
| `src/i18n/en.ts` / `ta.ts` | New strings |
| `START_WORKDAY_UX_REPORT.md` | This update |

**Not changed:** `TrackingContext`, GPS capture interval, sync, backend APIs.

## TypeScript result

```text
npx tsc --noEmit → pass
```

## Expo Doctor result

```text
npx expo-doctor → 17/18 (pre-existing Prebuild vs checked-in android/ios)
```

## Android build result

Not run — **no Gradle / native source changes**. `gradlew assembleDebug` not required for this commit.

## Physical-device test result

Not executed in this session. Required before claiming production readiness:

| Case | Expected |
|------|----------|
| Permission on, GPS on | No dialog → start |
| Permission on, GPS off → OK | Native dialog → auto-continue → start |
| GPS off → cancel | Inline message + Try Again |
| Permission first-time | Runtime permission → GPS check |
| Permission blocked | App Settings (not location page) |
| No Play Services | Fallback Open Location Settings |

## Remaining fallback cases

- iOS: no Play Services dialog; services off → `unavailable` → Settings fallback
- Resolution cancelled after OK but providers still off → unavailable fallback
- Concurrent Start taps → `busy` (ignored)
- `startDay()` still owns final GPS fix / its own alerts

## Earlier UX work (still in place)

Prominent Start Workday panel, readiness row, active state + New Visit / Farmers / My Route, EN/TA i18n, Today ↔ Day shared `TrackingContext`.
