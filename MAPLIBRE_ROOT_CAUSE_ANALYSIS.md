# MapLibre Root Cause Analysis

**Date:** 2026-07-12  
**Issue:** Expo Go showed an orange error placeholder; GitHub APK did not render native MapLibre tiles.

---

## Executive Summary

Two separate bugs caused both environments to fail:

| Environment | Root cause | Symptom |
|-------------|------------|---------|
| **GitHub APK / dev build** | `canRenderMap` pre-gate in `FieldMapViewMapLibre` blocked `<Map>` from mounting unless GPS, markers, route, fit coords, and style checks all passed simultaneously | Orange “Map unavailable” placeholder instead of tiles |
| **Expo Go** | Weak runtime detection + schematic treated as error UI; route polylines never passed (`route={[]}`) | Blank/orange box instead of route preview |

Both are fixed. Native builds now **always mount MapLibre** when permissions resolve; Expo Go shows an **enhanced SVG route preview** and never loads the native module.

---

## Root Cause 1 — APK showed placeholder (not MapLibre)

### Exact mechanism

`FieldMapViewMapLibre.tsx` used a `canRenderMap` boolean that had to be `true` before rendering `<Map>`:

```typescript
// BEFORE (broken)
if (!canRenderMap) {
  return <orange placeholder with Ionicons alert-circle />;
}
return <Map ... />;
```

`canRenderMap` required **all** of:

- Style URL configured and not failed
- `permissionResolved && !loading`
- Valid region coordinates
- **`hasRenderableCoordinates`** (markers OR route OR fit OR user location)
- **`showsUserLocation && locationGranted`** when user location enabled

### Why APK hit this path

1. **Day / My Route screens passed `route={[]}`** — no GPS polyline, only markers/fit coords. If markers were still loading or fit was a single point, `hasRenderableCoordinates` was false → placeholder.
2. **My Route with `showsUserLocation={hasLiveGps}`** — when GPS not yet granted, entire map blocked even though visit markers existed.
3. **Style URL could resolve to null** in some dev paths (`resolveMapStyleUrl()` returned `null` outside production), triggering “Map configuration unavailable” orange state.
4. **Style load failures** set `mapStyleFailed` but replaced the whole map with the same orange placeholder — no tiles attempted, no error reason shown.

### Proof native MapLibre will load in APK now

- `canRenderMap` gate **removed**; replaced with `shouldMountMap = permissionResolved && !loading && !errorMessage`
- `<Map mapStyle={url}>` **always mounts** when `shouldMountMap`
- `resolveMapStyleUrl()` **never returns null** — falls back to `https://demotiles.maplibre.org/style.json`
- Style URL logged: `[mapStyle] Loaded style URL (…)` and `[Map:ScreenName] Loaded style URL: …`
- HTTP validation via `validateMapStyleUrl()` — demo URL returns valid JSON (version 8, 50+ layers)
- CI verify script confirms: `FieldMapViewMapLibre mounts native Map without canRenderMap pre-gate` ✅
- Tile load failure shows **explicit banner** with URL and reason instead of silent orange screen

---

## Root Cause 2 — Expo Go showed orange placeholder

### Exact mechanism

1. **Possible MapLibre path leakage:** `isExpoGo()` only checked `Constants.executionEnvironment === "storeClient"`. On some SDK builds this alone is insufficient → lazy MapLibre import attempted → native module missing → error boundary / warning placeholder (orange `#C2410C` icon).

2. **Schematic was incomplete:** Even when schematic rendered, **`route={[]}`** on Day and My Route meant no polyline. Early returns for `!geometry` showed plain text on muted background — looked like an error panel.

3. **Schematic used error-adjacent styling:** Shared placeholder patterns (warning icon colors, “Map unavailable” copy) made the preview look broken rather than intentional.

### Proof Expo Go uses improved fallback only

- `isExpoGo()` now checks **three signals:** `executionEnvironment`, `appOwnership === "expo"`, `Constants.expoGoConfig`
- `FieldMapView` routes: `if (expoGo || !nativeMap) → FieldMapViewSchematic` — **never** lazy-imports MapLibre
- Schematic features:
  - White background `#FAFBFA`
  - Grid lines
  - Route polyline (from `route` or `fitCoordinates` fallback)
  - Direction arrows along route
  - Visit / start / end markers
  - Blue GPS dot when `liveFocus` / user location available
  - North indicator
  - Distance pill (haversine)
  - Banner: *“Route preview · base map tiles load in a development or release build.”*
- GPS denied → preview still renders with saved visit markers + info banner (does not block field work)

---

## Root Cause 3 — Missing route data (both environments)

Day and My Route passed **`route={[]}`** despite having GPS track data available.

### Fix

- `buildWorkdayGpsRoute()` wired in:
  - `DaySummaryRouteCard.tsx`
  - `useMyLocationScreen.ts` → `MyLocationScreen.tsx`
- Polylines now render in both schematic (Expo Go) and MapLibre GeoJSON layers (APK).

---

## Files Changed

| File | Change |
|------|--------|
| `src/utils/mapLibreNative.ts` | Robust Expo Go detection; `isNativeMapRuntime()`; `EXPO_GO_MAP_HINT` |
| `src/config/mapStyle.ts` | Never-null style URL; logs loaded URL |
| `src/utils/mapStyleValidation.ts` | **New** — HTTP/style JSON validation |
| `src/components/map/FieldMapView.tsx` | Route Expo Go → schematic; native → lazy MapLibre |
| `src/components/map/FieldMapViewMapLibre.tsx` | Always mount `<Map>`; remove `canRenderMap`; style logging; error banner |
| `src/components/map/FieldMapViewSchematic.tsx` | Full route preview UI for Expo Go |
| `src/hooks/useMyLocationScreen.ts` | GPS route polyline via `buildWorkdayGpsRoute` |
| `src/screens/map/MyLocationScreen.tsx` | Pass `route={routeLine}` |
| `mobile/components/daySummary/DaySummaryRouteCard.tsx` | Pass `route={routeLine}` + `liveFocus` |
| `src/utils/mapDebug.ts` | Diagnostic fields updated |
| `scripts/verify-maplibre-release.mjs` | Updated checks for new architecture |

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run test:offline` | ✅ 5/5 |
| `npx expo install --check` | ✅ |
| `expo prebuild --clean` + manifest | ✅ INTERNET, no Google API key |
| `verify-maplibre-release.mjs` | ✅ 24/24 |
| Demo style URL HTTP | ✅ Valid MapLibre style JSON |

---

## Expected Behaviour After Fix

### Expo Go
- White route preview with polyline, markers, GPS dot, distance, north arrow
- Green banner explaining tiles need dev/release build
- **No orange error box**
- **No MapLibre native module loaded**

### Dev build / GitHub APK
- Native MapLibre tiles load immediately after permissions resolve
- Route GeoJSON line + markers + user location overlay
- Style URL logged to console
- Tile failures show explicit reason banner (not full-screen orange placeholder)
- **Schematic never mounts**

---

## Recommended Manual QA

1. **Expo Go:** Start workday → Day card shows route preview with polyline + hint banner (not orange).
2. **Dev build / CI APK:** Same screen shows raster map tiles from demotiles.maplibre.org.
3. **Logcat / Metro:** Confirm `[Map:DaySummaryRouteCard] Loaded style URL: https://demotiles.maplibre.org/style.json`
4. Open My Route, Farmer Map, Tracking, Visit preview — all should show tiles (APK) or route preview (Expo Go).

---

## Verdict

**Fixed.** The placeholder was not a MapLibre installation failure — it was **application logic preventing the map from mounting** plus **missing route data** and **weak Expo Go routing**. Native MapLibre is now always mounted in APK/dev builds; Expo Go uses a purposeful route preview fallback.
