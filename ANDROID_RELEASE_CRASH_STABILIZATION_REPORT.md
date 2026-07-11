# Android Release Crash Stabilization Report

**Date:** 2026-07-12  
**Repository:** `d:\agri-clinic-mobile`  
**Baseline commit:** `c80d2d2`  
**Stabilization commit:** _(local — not pushed; device matrix pending)_

---

## 1. Executive summary

A systematic release-crash audit was performed using static code analysis, dependency checks, navigation inventory, and automated tests. **Live logcat capture was not possible** on the audit machine (no `adb`/JDK/Android SDK in PATH, no device attached).

Several **confirmed navigation and permission defects** were fixed that explain “app closes” or “leaves to Settings” reports on release APKs. Native crash stack traces remain **pending physical-device retest** with the checklist and logcat guide.

**Verdict: Unstable — crashes remain unverified on device; code-level root causes mitigated pending APK matrix.**

---

## 2. Reproduced crashes

| Evidence type | Result |
|---------------|--------|
| Live logcat | **Not captured** — no adb |
| Static reproduction | **Yes** — broken root navigation on Notifications; unsafe patterns on tabs/maps/permissions |
| User-reported | Day tab exit, splash static, Settings opens |

---

## 3. Device / Android versions

| Device | Android | APK commit | Tester |
|--------|---------|------------|--------|
| Pending | Pending | Pending | Field QA required |

---

## 4. Exact stack traces

None captured in this audit session. Use `scripts/capture-android-crash-log.md` on a connected device.

---

## 5. Root causes and fixes

| ID | Root cause | Fix | Files |
|----|------------|-----|-------|
| CRASH-002 | Root-stack screens used `navigation.getParent()` → undefined navigate | Central `rootNavigationRef` + safe dispatch | `src/navigation/rootNavigationRef.ts`, `notifications.tsx`, `visit/success.tsx`, `tracking.tsx` |
| CRASH-001 | Day tab lacked screen error boundary | `SafeDayScreen` + all major routes wrapped | `RootNavigator.tsx` |
| CRASH-003/004 | Auto Settings from permission modal / GPS compliance | In-app permission retry; banner-only probes | `locationRequiredModal.ts`, `GpsComplianceContext.tsx` (c80d2d2) |
| CRASH-006 | Malformed coords to maps | `filterMapCoordinates` | `mapCoords.ts`, `FieldMapView.tsx` |
| CRASH-008 | Uncaught async on FAB | try/catch | `VisitFabTabButton.tsx` |

---

## 6. Navigation audit

- **Architecture:** React Navigation 6 (not Expo Router). See agent inventory in commit notes.
- **High-risk fixed:** Notifications row navigation, Visit success exit, Day → My Route.
- **Remaining:** Legacy screens (`HomeScreen`, `BottomNav`) still reference dead routes if re-wired — not mounted in V2 navigator.

---

## 7. Native module audit

| Package | Version | Notes |
|---------|---------|-------|
| react-native-reanimated | 4.1.7 | worklets 0.5.1 deduped; babel preset only (no duplicate plugin) |
| react-native-maps | 1.20.1 | Coordinate filtering before polyline |
| expo-location | ~19.0.8 | Foreground-first workday start |
| newArchEnabled | true | `android/gradle.properties` |

`npx expo-doctor`: 17/18 pass (native folder + app.config sync warning — expected with prebuild).

---

## 8. Permission / settings audit

| Call site | Auto-open Settings? | Status |
|-----------|---------------------|--------|
| `workdayLocationGate` | No (inline only) | OK |
| `locationRequiredModal` | No (re-request in-app) | **Fixed this pass** |
| `GpsComplianceContext.showPermissionHelp` | User tap only | OK |
| Tab presses | No GPS/settings | OK |

---

## 9. Map / GPS audit

- `hasValidMapCoords`, `sanitizeRegion`, `fitMapRegion` already present.
- Added `filterMapCoordinates` for native map polylines.
- Day summary map gated on `previewWidth > 0` and valid region.

---

## 10. Animation / SVG audit

- Splash: continuous zoom loop (`KavyaCinematicSplash.tsx`).
- Tab bar: removed Reanimated from tab items (static styles) — avoids release worklet crashes.
- Decorative animations still use Reanimated; core nav works if disabled via error boundary.

---

## 11. Build results

| Command | Result |
|---------|--------|
| `npm run typecheck` | **Pass** |
| `npm run test:offline` | **5/5 pass** |
| `npx expo-doctor` | 17/18 pass |
| `gradlew assembleDebug/Release` | **Not run** — Java/JDK not installed on audit machine |
| GitHub Actions APK | Prior builds at `c80d2d2`; new build required after this commit |

---

## 12. Physical device results

**Not executed** — requires device + adb. Use `ANDROID_RELEASE_CRASH_TEST_CHECKLIST.md`.

---

## 13. Remaining known risks

1. No logcat-confirmed closure after fixes.
2. `react-native-maps` on low-end devices without Google Play Services.
3. Legacy unmounted screens with dead route names if reused.
4. Background location deferred — foreground loop fallback only until user grants background in Settings manually.

---

## 14. Final verdict

**Unstable — crashes remain** (device verification pending)

Upgrade to **Ready for internal QA** after:

1. GitHub Actions APK from stabilization commit
2. Full 25-step checklist on 2 devices
3. Zero FATAL/ReactNativeJS entries during matrix
4. Logcat evidence filed in `ANDROID_RELEASE_CRASH_MATRIX.md`

---

## Verification commands run

```
npm run typecheck          ✓
npm run test:offline       ✓
npx expo-doctor            ✓ (1 warning)
node scripts/test-navigation-smoke.mjs  ✓ (file presence)
```
