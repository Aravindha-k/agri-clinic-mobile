# MapLibre Final Stability Report

**Date:** 2026-07-12  
**Product decision:** Keep MapLibre — do not migrate to Google Maps until device QA proves otherwise.

---

## Final verdict

### Ready for internal MapLibre QA

Static verification, CI gates, and OpenFreeMap style HTTP validation pass. **Physical device matrix not completed in this session** — install the fresh GitHub Actions APK before limited client QA.

---

## Style URL used

| Environment | URL |
|-------------|-----|
| GitHub QA APK | `https://tiles.openfreemap.org/styles/liberty` |
| Production fallback (no env) | Same OpenFreeMap Liberty URL |
| Local dev (no env) | Demo tiles only when `__DEV__` |
| **Not used for QA** | `https://demotiles.maplibre.org/style.json` |

Style selection is centralized in `src/config/mapStyle.ts`. Components never hardcode URLs.

HTTP validation: OpenFreeMap style returns version 8, 111 layers, HTTPS sources ✅

---

## Permission-guard implementation

| Guard | Implementation |
|-------|----------------|
| Runtime permission source | `useMapForegroundPermission()` — `expo-location` foreground + services enabled |
| `UserLocation` mount | Only when `showLiveUserLocation && foreground.granted && servicesEnabled` |
| Camera follow | **Removed** `trackUserLocation` — uses `liveFocus` + `easeTo` when `followLiveUserLocation` |
| Permission denied | Map still mounts; route + markers visible; inline info banner |
| Stored coordinates | Rendered as markers — no native live dot |

### Screen live-location rules

| Screen | `showLiveUserLocation` | `followLiveUserLocation` |
|--------|---------------------|-------------------------|
| Day route card | When workday active + live GPS | false |
| My Route | When `hasLiveGps` | When tracking active |
| Tracking | When permission + fix | false |
| Farmer Map | **false** (stored "you" marker) | false |
| Visit Preview | **false** | false |

---

## Expo Go behavior

- Routes to `FieldMapViewSchematic` only (`isExpoGo()`)
- Never imports `@maplibre/maplibre-react-native`
- Shows: route line, markers, stored location, north indicator, distance
- Caption: *Route preview · live map available in app build*
- Neutral background — not an error state

---

## APK / dev build behavior

- Always lazy-loads `FieldMapViewMapLibre` (no TurboModule pre-check)
- Native `<Map>` mounts when permissions resolved (not blocked by missing GPS)
- OpenFreeMap street tiles (roads + labels)
- GeoJSON route line (≥2 points)
- Tile failure: neutral banner — *Map tiles could not load. Your route and visit data are still being recorded.*
- GPS capture / offline queues unaffected by tile state

---

## Offline behavior

- GPS route buffering continues independently of basemap tiles
- Route polylines and markers render from local state
- No offline tile packs claimed — basemap may be blank offline with safe message
- Workday, visits, End Workday, sync queues remain usable

---

## Performance notes

- Route simplified via `buildWorkdayGpsRoute` / `simplifyRouteForMap`
- GeoJSON memoized per route array
- Camera `liveFocus` debounced (700 ms)
- No native `trackUserLocation` continuous follow
- Single shared GeoJSON source for route + accuracy rings

---

## Automated validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ |
| `npm run test:offline` | ✅ 5/5 |
| `npx expo install --check` | ✅ |
| `expo prebuild --clean` | ✅ |
| `verify-maplibre-release.mjs` | ✅ 32/32 |
| OpenFreeMap style HTTP | ✅ |

---

## GitHub workflow result

Workflow: `.github/workflows/android-apk.yml`

- `EXPO_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty`
- Fails verify if demo style detected
- MapLibre plugin + no Google Maps metadata checks

**Commits:**
- `734a2de` — `fix(map): stabilize MapLibre style and permission handling`
- `77b34e1` — `fix(ci): validate MapLibre QA build configuration`
- `docs(map): record final MapLibre stability decision` (latest on `main`)

Monitor the Android APK workflow on `main` after push.

---

## Physical device results

**Not tested on device in this session.**

Required manual matrix (20 scenarios) — see task checklist. Install fresh APK after uninstalling old build.

Watch logcat for:
- `map_style_selected` / `map_style_loaded`
- No `SecurityException` from location
- No `MLRN*` native crash

---

## Remaining tile-hosting limitation

OpenFreeMap is suitable for **internal/client QA**, not unlimited production scale. Before production:

1. Host organisation-approved style + tiles (see `MAP_TILE_HOSTING.md`)
2. Set `EXPO_PUBLIC_MAP_STYLE_URL` to production endpoint
3. Plan offline tile strategy if field connectivity is poor

---

## Files changed (this stabilization)

| Area | Files |
|------|-------|
| Style | `src/config/mapStyle.ts`, `mapStyleDiagnostics.ts`, `mapStyleValidation.ts` |
| Permission | `src/hooks/useMapForegroundPermission.ts` |
| Map core | `FieldMapView*.tsx`, `FieldMapView.types.ts`, `mapLibreNative.ts` |
| Screens | Day, My Route, Tracking, Farmer, Visit Preview |
| CI | `.github/workflows/android-apk.yml`, `verify-maplibre-release.mjs`, `.env.example` |

---

## Google Maps fallback

**Not activated.** Only consider if fresh APK device QA still fails after this stabilization.
