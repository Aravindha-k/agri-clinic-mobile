# Google Maps final restoration report

**Date:** 2026-07-13  
**Repository:** `agri-clinic-mobile` (Kavya Agri Clinic field app)  
**Verdict:** **Ready to configure Google Cloud key**

---

## Historical stable reference

| Item | Value |
|------|--------|
| Original stable map commit | `9b5dbd9` — shared `react-native-maps` `FieldMapView` |
| API-key pipeline commit | `e94a80d` — `GOOGLE_MAPS_ANDROID_API_KEY` → manifest |
| MapLibre migration (reverted) | `59f4177` |
| Safety branch | `backup-before-google-maps-restore` |

Root cause (see `GOOGLE_MAPS_HISTORICAL_ROOT_CAUSE.md`): Expo Go supplied the native map environment; standalone GitHub APK crashed because `com.google.android.geo.API_KEY` was missing from generated `AndroidManifest.xml`.

---

## Map engine restored

- **Engine:** `react-native-maps@1.20.1` (Expo SDK 54 compatible via `npx expo install react-native-maps`)
- **Shared component:** `src/components/map/FieldMapView.tsx`
- **Map surfaces using FieldMapView:** Day route preview, My Route, Tracking map, Farmer map, Visit location preview
- **MapLibre:** fully removed from runtime dependencies and source (no `@maplibre/maplibre-react-native`, no MapLibre config plugin, no MapLibre components)

---

## Location and Day screen fixes

| Area | Change |
|------|--------|
| Visit FAB | Workday checked first; context-specific messages for inactive workday, permission, GPS off; no auto Settings redirect; double-tap guard |
| Tracking errors | Structured sources: `start_workday`, `tracking`, `visit_location`, `end_workday`, `sync` |
| Active workday GPS loss | Shows **"Location signal lost. Tracking will resume automatically."** — not "Could not end workday" |
| End workday errors | Shown only when `errorSource === end_workday` |
| Map permission | Map renders stored route/markers when permission denied; live dot gated on `showsUserLocation && locationGranted` |
| Expo Go | `isAndroidMapsNativeConfigured()` allows Expo Go native maps environment |

---

## API key build pipeline

| Step | Implementation |
|------|----------------|
| Env variable | `GOOGLE_MAPS_ANDROID_API_KEY` (not `EXPO_PUBLIC_*`) |
| `app.config.js` | `android.config.googleMaps.apiKey` |
| `.env.example` | Placeholder only |
| GitHub Actions | Secret in job `env`, preflight check (no value logged), prebuild, manifest verify |
| Manifest metadata | `com.google.android.geo.API_KEY` inside `<application>` |
| Release verifiers | `scripts/verify-android-maps-config.mjs`, `scripts/verify-google-maps-release.mjs` |

---

## Validation run (local)

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run test:offline` | Pass (5/5) |
| `npx expo install --check` | Pass |
| `npx expo-doctor` | 17/18 (prebuild/CNG advisory only) |
| `npx expo prebuild --platform android --clean` | Pass (test key) |
| `verify-android-maps-config.mjs` | Pass — manifest metadata present |
| `verify-google-maps-release.mjs` | Pass — 19/19 checks |
| Gradle `assembleRelease` | Not run locally (CI runs Gradle) |

---

## Git commits (restoration series)

| Commit | Message |
|--------|---------|
| `a10948e` | `revert(map): remove unstable MapLibre migration` |
| `882078c` | `restore(map): restore stable Google Maps implementation` |
| `40113e3` | `ci(android): restore Google Maps API key pipeline` |
| *(this push)* | `fix(location): unify Visit FAB and Day screen tracking errors` |
| *(this push)* | `ci(android): add Google Maps release verifier` |
| *(this push)* | `docs(map): document Google Maps setup and restoration report` |

**Excluded from commits:** `src/storage/AuthContext.tsx` (unrelated splash work), generated `android/` prebuild output, `.env.local`.

---

## GitHub Actions status

| Run | Result | Notes |
|-----|--------|-------|
| Workflow #29 | Failed | `GOOGLE_MAPS_ANDROID_API_KEY` secret not configured |
| After push | Expected | Will fail preflight until secret is added |

**Required manual step:** Add repository secret `GOOGLE_MAPS_ANDROID_API_KEY` in GitHub → Settings → Secrets and variables → Actions. See `GOOGLE_MAPS_ANDROID_SETUP.md` for Google Cloud steps and SHA-1 instructions.

---

## Physical device QA

Not performed in this session. After a successful GitHub APK build:

1. Uninstall old APK → install fresh APK  
2. Grant location → enable device GPS → login → Start Workday  
3. Exercise Day, My Route, Visit FAB, Farmer Map, Visit Preview  
4. Re-test with permission denied (map opens, markers render, no live dot, no crash)  
5. `adb logcat` — confirm no `API key not found`, no permission `SecurityException`

---

## Remaining manual setup

1. Create Google Cloud project with billing  
2. Enable **Maps SDK for Android** only  
3. Create Android-restricted API key for `com.kavya.agriclinic` + GitHub QA debug keystore SHA-1  
4. Add `GOOGLE_MAPS_ANDROID_API_KEY` GitHub secret  
5. Re-run Android APK workflow  
6. Install APK on device and complete QA matrix above  

---

## Verdict rationale

**Ready to configure Google Cloud key** — code, CI pipeline, and verifiers are in place; the last blocking item is the GitHub secret and Google Cloud key restriction for the signing certificate. Physical APK evidence is required before **Ready for internal APK QA** or **Ready for limited client QA**.
