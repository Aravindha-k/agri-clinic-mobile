# Google Maps Restore Report

**Date:** 2026-07-13  
**Action:** Restored last stable Google Maps implementation and removed MapLibre migration.

## Stable commit restored

Base implementation: **`e94a80d`** — `fix(android): inject Google Maps API key into release builds`

Core map component lineage: **`9b5dbd9`** — original stable `react-native-maps` `FieldMapView`

Restored the Google Maps stack from `e94a80d` because it includes the original working map code **plus** the correct API-key pipeline that fixes the GitHub APK crash.

## Files restored

| File | Source |
|------|--------|
| `src/components/map/FieldMapView.tsx` | `e94a80d` |
| `src/components/map/FieldMapView.types.ts` | `e94a80d` |
| `src/components/map/FieldMapMarker.tsx` | `e94a80d` |
| `src/utils/mapsNativeConfig.ts` | `e94a80d` |
| `src/types/mapType.ts` | `e94a80d` |
| `app.config.js` | `e94a80d` (Google Maps key injection) |
| `.github/workflows/android-apk.yml` | `e94a80d` |
| `scripts/verify-android-maps-config.mjs` | `e94a80d` |
| `scripts/ensure-android-release-config.mjs` | `e94a80d` |
| `scripts/audit-apk-release.mjs` | `e94a80d` |
| `.env.example` | `e94a80d` |
| `GOOGLE_MAPS_ANDROID_SETUP.md` | `e94a80d` |
| `ANDROID_MAPS_API_KEY_CRASH_FIX_REPORT.md` | `e94a80d` |

Screen prop updates (MapLibre → Google Maps API names):

- `showLiveUserLocation` → `showsUserLocation`
- `followLiveUserLocation` → `followsUserLocation`

Preserved (not reverted):

- Location permission improvements (`locationServicesProbe`, Visit FAB GPS gate)
- Route polylines, markers, offline GPS, workday, visit flow

## Files removed

| File | Reason |
|------|--------|
| `@maplibre/maplibre-react-native` | Replaced by `react-native-maps@1.20.1` |
| `FieldMapViewMapLibre.tsx` | MapLibre native map |
| `FieldMapViewSchematic.tsx` | Expo Go SVG fallback |
| `FieldMapViewPlaceholder.tsx` | MapLibre loading placeholder |
| `fieldMapCamera.ts` | MapLibre camera helper |
| `mapLibreNative.ts` | MapLibre runtime detection |
| `mapStyle.ts`, `mapStyleDiagnostics.ts`, `mapStyleValidation.ts` | MapLibre tile config |
| `scripts/verify-maplibre-release.mjs` | MapLibre CI verifier |
| `MAPLIBRE_*.md`, `MAP_TILE_HOSTING.md`, `FINAL_MAPLIBRE_PUSH_REPORT.md` | MapLibre documentation |

## Google Maps key pipeline

| Layer | Configuration |
|-------|---------------|
| Env var | `GOOGLE_MAPS_ANDROID_API_KEY` (native only, not `EXPO_PUBLIC_*`) |
| `app.config.js` | `android.config.googleMaps.apiKey` from env |
| `extra.mapsNativeConfigured` | Boolean flag for JS-side guard |
| Post-prebuild | `scripts/ensure-android-release-config.mjs` injects manifest metadata |
| Verification | `scripts/verify-android-maps-config.mjs` checks `com.google.android.geo.API_KEY` |

No API key is hardcoded in source.

## Manifest verification

Local validation (with test env var, value not committed):

```text
npx expo prebuild --platform android --clean --no-install
node scripts/verify-android-maps-config.mjs
→ OK — com.google.android.geo.API_KEY present
```

## GitHub workflow verification

`.github/workflows/android-apk.yml`:

1. `npm ci`
2. Preflight: fail if `GOOGLE_MAPS_ANDROID_API_KEY` secret missing
3. `npx expo prebuild --platform android --clean --no-install`
4. `node scripts/ensure-android-release-config.mjs`
5. `node scripts/verify-android-maps-config.mjs`
6. `./gradlew assembleRelease`
7. Upload APK artifact

## Automated validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run test:offline` | Pass (5/5) |
| `npx expo install --check` | Pass |
| `npx expo-doctor` | 17/18 (expected prebuild/CNG notice) |
| `expo prebuild --clean` | Pass (with `GOOGLE_MAPS_ANDROID_API_KEY` set) |
| `verify-android-maps-config.mjs` | Pass |

## APK verification

GitHub Actions APK build requires the repository secret below. **Push triggers workflow; build succeeds only when secret is configured.**

## Remaining manual step

Add GitHub repository secret:

**Name:** `GOOGLE_MAPS_ANDROID_API_KEY`  
**Value:** Valid Google Maps Android API key (Maps SDK for Android enabled, restricted to app package + signing certificate SHA-1)

Settings → Secrets and variables → Actions → New repository secret

See `GOOGLE_MAPS_ANDROID_SETUP.md` for Google Cloud Console and SHA-1 instructions.

## Map screens

All use shared `FieldMapView` (`react-native-maps`):

- Day (`DaySummaryRouteCard`)
- Tracking (`TrackingLocationMap`)
- My Route (`MyLocationScreen`)
- Farmer Map (`FarmerMapScreen`)
- Visit Preview (`LocationPreviewMap`)
- Travel History (via shared map utilities)

## Final verdict

Google Maps implementation restored from Git history. MapLibre migration fully removed. Original APK failure path is fixed via secret-backed manifest injection — not via MapLibre.
