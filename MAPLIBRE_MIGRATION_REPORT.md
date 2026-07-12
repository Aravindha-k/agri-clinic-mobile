# MapLibre migration report

**Date:** 2026-07-12  
**Package:** `com.kavya.agriclinic`  
**Map engine:** `@maplibre/maplibre-react-native` v11.3.6  
**Expo SDK:** 54 (unchanged)

---

## Problem

Release QA APKs crashed on map screens with:

```text
java.lang.IllegalStateException: API key not found … com.google.android.geo.API_KEY
```

**Product decision:** remove paid Google Maps dependency entirely; use open MapLibre + configurable OSM-compatible style URLs.

---

## Map usage inventory (pre-migration)

| Screen / surface | File | Map features | Data source | Migration |
|------------------|------|--------------|-------------|-----------|
| Day summary preview | `mobile/components/daySummary/DaySummaryRouteCard.tsx` | Markers, fit bounds, user location, non-interactive | Local workday GPS + visits | **Low** — uses `FieldMapView` |
| My Route / Travel History | `src/screens/map/MyLocationScreen.tsx` + `useMyLocationScreen.ts` | Markers, fit, follow user, accuracy ring, camera controls | Tracking context + server/buffer GPS | **Low** — uses `FieldMapView`; hook `mapRef` retargeted |
| Tracking map | `src/components/TrackingLocationMap.tsx` | Route/markers preview | Tracking context | **Low** |
| Farmer location | `src/screens/map/FarmerMapScreen.tsx` | Single/multi marker, region | Farmer API coords | **Low** |
| Visit / location preview | `src/components/map/LocationPreviewMap.tsx` | Compact marker map | Visit/farmer coords | **Low** |
| Shared abstraction | `src/components/map/FieldMapView.tsx` | All native map rendering | N/A | **High** — single rewrite |
| Markers | `src/components/map/FieldMapMarker.tsx` | Pin views | N/A | **Medium** — MapLibre `Marker` |
| Route utilities | `src/utils/dayRouteMap.ts`, `routeSimplify.ts` | Data only (no native map) | GPS + visits | **None** |

All screens route through **`FieldMapView`** — migrated once, not screen-by-screen.

---

## Screens migrated

- Day (summary route card map preview)
- My Route (`MyLocationScreen`)
- Travel History (same screen stack)
- Farmer map (`FarmerMapScreen`)
- Visit/location previews (`LocationPreviewMap`)
- Tracking map (`TrackingLocationMap`)

No Day screen layout redesign. No backend / GPS / offline queue changes.

---

## Package added

```json
"@maplibre/maplibre-react-native": "^11.3.6"
```

**Removed:** `react-native-maps`

**Expo config plugin:** `@maplibre/maplibre-react-native` in `app.config.js`

**Requires:** dev client or release APK rebuild (`expo prebuild` + `run:android` / CI). **Not compatible with Expo Go.**

New Architecture is enabled (`newArchEnabled=true`) — required for MapLibre v11.

---

## Google Maps code removed

| Item | Action |
|------|--------|
| `react-native-maps` | Uninstalled |
| `android.config.googleMaps.apiKey` | Removed from `app.config.js` |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Removed from env, CI, scripts |
| `com.google.android.geo.API_KEY` manifest injection | Removed from `ensure-android-release-config.mjs` |
| `scripts/verify-android-maps-config.mjs` | Deleted |
| `src/utils/mapsNativeConfig.ts` | Deleted |
| Google Maps setup / crash reports | Deleted |

**Kept:** `expo-location`, background GPS, Play Services used indirectly by location/notifications (unchanged).

---

## Map style configuration

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_MAP_STYLE_URL` | Production / default style JSON URL |
| `EXPO_PUBLIC_MAP_STYLE_URL_STAGING` | Staging / preview |
| `EXPO_PUBLIC_MAP_STYLE_URL_DEV` | Local dev override |

Runtime resolver: `src/config/mapStyle.ts`

- Development fallback: MapLibre demo tiles (`https://demotiles.maplibre.org/style.json`)
- Production without URL: safe placeholder — **no native crash**
- CI QA APK: demo style URL in `.github/workflows/android-apk.yml`

See **`MAP_TILE_HOSTING.md`** for production tile-hosting decisions and OSM usage limits.

---

## Implementation highlights

### `FieldMapView` (MapLibre)

- `Map` + `Camera` + `GeoJSONSource` + `Layer` for route polylines (efficient single LineString)
- `Marker` for visit/start/end/farmer pins
- `UserLocation` for live GPS puck + optional accuracy
- `fitBounds` / `easeTo` via `FieldMapCameraRef` (replaces `fitToCoordinates` / `animateToRegion`)
- Invalid coordinates filtered via existing `mapCoords` utilities
- Route requires ≥ 2 valid points before drawing a line
- Style load failure → `MAP_UNAVAILABLE_MESSAGE` (no app exit)

### Offline limitations

- **Offline GPS routes / visit markers:** preserved (unchanged storage/sync)
- **Offline map tiles:** **not** implemented — tiles may fail offline; UI shows clear message; workday continues

---

## Files changed

**Added**

- `src/config/mapStyle.ts`
- `src/components/map/fieldMapCamera.ts`
- `MAP_TILE_HOSTING.md`
- `MAPLIBRE_MIGRATION_REPORT.md`

**Rewritten**

- `src/components/map/FieldMapView.tsx`
- `src/components/map/FieldMapMarker.tsx`

**Updated**

- `app.config.js` — MapLibre plugin, `extra.mapStyleUrl`
- `package.json` / `package-lock.json`
- `.env.example`
- `.github/workflows/android-apk.yml`
- `scripts/audit-apk-release.mjs`
- `scripts/ensure-android-release-config.mjs`
- `src/hooks/useMyLocationScreen.ts` — `FieldMapCameraRef`
- `src/components/map/FieldMapView.types.ts`
- `src/components/map/index.ts`
- `src/components/map/MapErrorBoundary.tsx`
- `src/utils/mapDebug.ts`

**Deleted**

- `GOOGLE_MAPS_ANDROID_SETUP.md`
- `ANDROID_MAPS_API_KEY_CRASH_FIX_REPORT.md`
- `scripts/verify-android-maps-config.mjs`
- `src/utils/mapsNativeConfig.ts`

---

## Verification (audit machine)

| Check | Result |
|-------|--------|
| `npm run typecheck` | **Pass** |
| `npm run test:offline` | **Pass** (5/5) |
| `npx expo install --check` | **Pass** |
| `npx expo-doctor` | **17/18** — expected prebuild/CNG notice (checked-in `android/`) |
| `npx expo prebuild --platform android --clean` | **Pass** (MapLibre plugin applied) |
| `gradlew assembleRelease` | **Not run** — `JAVA_HOME` not configured on audit machine |
| Physical device / logcat | **Pending** — requires fresh APK install on device |

---

## Physical device result

**Pending.** After building and installing a fresh APK:

1. Cold start → Start Workday → Day → My Route
2. Empty route, single point, multi-point routes
3. Confirm **no** `com.google.android.geo.API_KEY` / Google Maps crash in logcat
4. Confirm MapLibre map renders with configured style URL

---

## Remaining tile-hosting decision

Before production fleet rollout, replace MapLibre demo tiles with a **lawful production style URL** (MapTiler/Stadia free tier, self-hosted tileserver, or organisation style). See `MAP_TILE_HOSTING.md`.

**No Google Maps API key is required.**

---

## Commits (focused)

1. `refactor(map): add shared MapLibre field map`
2. `refactor(map): migrate Day and route screens`
3. `chore(android): remove Google Maps API-key dependency`
4. `docs(map): document tile hosting and offline limits`

**Not pushed** until a fresh APK opens every map screen without crashing (per release gate).
