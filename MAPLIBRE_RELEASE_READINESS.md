# MapLibre Release Readiness Report

**Date:** 2026-07-12  
**Repository:** `agri-clinic-mobile`  
**Target:** GitHub Actions Android release APK (`android-apk.yml`)

---

## Verdict

### ✅ GitHub APK will show native MapLibre map

The release pipeline, dependency graph, routing logic, and style URL resolution are configured so the GitHub-built APK mounts **native MapLibre** (`FieldMapViewMapLibre`) on all map screens. The SVG schematic and *"Route preview · live tiles in dev build"* hint are **Expo Go only**.

**Confidence:** High for CI-built APK behavior (static + prebuild verification). **Not yet smoke-tested** on a physical device in this audit environment (no local JDK / Gradle).

---

## Checklist Results

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | `react-native-maps` completely removed | ✅ | Absent from `package.json`, `package-lock.json`, and all source imports |
| 2 | MapLibre is the only map implementation | ✅ | Native maps via `@maplibre/maplibre-react-native`; web stub in `FieldMapView.web.tsx`; Expo Go SVG in `FieldMapViewSchematic.tsx` |
| 3 | `app.config.js` MapLibre config plugin | ✅ | Plugin `"@maplibre/maplibre-react-native"` + `extra.mapStyleUrl` |
| 4 | Correct `@maplibre/maplibre-react-native` dependency | ✅ | `"^11.3.6"` in `package.json` |
| 5 | AndroidManifest post-prebuild | ✅ | `INTERNET`, location, network permissions; **no** `com.google.android.geo.API_KEY` |
| 6 | No `GOOGLE_MAPS_ANDROID_API_KEY` references | ✅ | Removed from code, CI, and manifest |
| 7 | GitHub Actions installs dependencies | ✅ | `npm ci` step |
| 8 | GitHub Actions runs prebuild before Gradle | ✅ | `expo prebuild --platform android --clean` → `ensure-android-release-config.mjs` → `assembleRelease` |
| 9 | `EXPO_PUBLIC_MAP_STYLE_URL` in CI build | ✅ | Job `env`, `.env.production` write step, and Gradle step env |
| 10 | Demo style fallback when no prod URL | ✅ | `https://demotiles.maplibre.org/style.json` in CI + `mapStyle.ts` production fallback |
| 11 | No *"Route preview · live tiles in dev build"* in APK | ✅ | Hint rendered only when `showExpoHint = isExpoGo()` in `FieldMapViewSchematic.tsx`; APK never loads schematic |
| 12 | APK mounts real native MapLibre | ✅ | `FieldMapView` lazy-loads `FieldMapViewMapLibre` when `!isExpoGo()` |
| 13 | Expo Go–only code paths | ✅ | See [Expo Go isolation](#expo-go-isolation) |
| 14 | All map screens use native path | ✅ | See [Screen coverage](#screen-coverage) |
| 15 | No release crash path from Google Maps | ✅ | Google Maps API key metadata removed; MapLibre lazy-loaded behind Expo Go gate |
| 16 | Automated checks | ✅ | See [Commands run](#commands-run) |

---

## Architecture (Release APK)

```
FieldMapView
├── isExpoGo() === true  → FieldMapViewSchematic (SVG + hint)   ← Expo Go only
└── isExpoGo() === false → lazy FieldMapViewMapLibre (native)    ← GitHub APK
                              └── Map / Camera / GeoJSON / Markers
                                  style URL from resolveMapStyleUrl()
```

**Critical fix verified:** `FieldMapView` no longer gates on `isMapLibreNativeAvailable()`. That TurboModule pre-check could falsely route release builds to the SVG fallback. Routing is now **only** `isExpoGo()`.

---

## Expo Go isolation

| Search term | Location | APK behavior |
|-------------|----------|--------------|
| `expo_go_limited` | `src/tracking/backgroundLocationService.ts`, `trackingDevLog.ts` | Dev log tag only; unrelated to map rendering |
| `Route preview · live tiles in dev build` | `FieldMapViewSchematic.tsx` line 302 | Shown only when `isExpoGo()` is true |
| `FieldMapViewSchematic` | Imported only from `FieldMapView.tsx` inside `if (expoGo)` branch | Never mounted in APK |

APK `Constants.executionEnvironment` is `standalone` or `bare`, **not** `storeClient`, so `isExpoGo()` returns `false`.

---

## Screen coverage

All five map surfaces import shared `FieldMapView`:

| Screen | File |
|--------|------|
| Day (route card) | `mobile/components/daySummary/DaySummaryRouteCard.tsx` |
| My Route / Travel History | `src/screens/map/MyLocationScreen.tsx` |
| Farmer Map | `src/screens/map/FarmerMapScreen.tsx` |
| Tracking Map | `src/components/TrackingLocationMap.tsx` |
| Visit Preview | `src/components/map/LocationPreviewMap.tsx` |

---

## Style URL resolution (production)

Priority in `src/config/mapStyle.ts`:

1. `Constants.expoConfig.extra.mapStyleUrl` (set at prebuild from env)
2. `process.env.EXPO_PUBLIC_MAP_STYLE_URL` (inlined at Metro bundle time)
3. **`MAPLIBRE_DEMO_STYLE_URL`** → `https://demotiles.maplibre.org/style.json`

GitHub Actions sets the demo URL at three layers:

- Workflow `env` block
- `.env.production` written before `npm ci`
- Gradle `assembleRelease` step `env`

---

## CI pipeline (map-relevant steps)

```yaml
npm ci
npx tsc --noEmit
npx expo prebuild --platform android --clean --no-install
node scripts/ensure-android-release-config.mjs
node scripts/verify-maplibre-release.mjs   # ← release gate (23 checks)
./gradlew assembleRelease                  # EXPO_PUBLIC_MAP_STYLE_URL set
```

`scripts/verify-maplibre-release.mjs` exits **1** on any blocking issue. It is wired into the workflow after prebuild.

---

## Android native module

- `@maplibre/maplibre-react-native@11.3.6` present in `node_modules` with `android/build.gradle`
- Expo config plugin registered in `app.config.js` (Gradle properties helper)
- React Native **New Architecture enabled** (`newArchEnabled=true`); MapLibre ships TurboModule codegen (`MLRNCameraModule`, `MLRNMapView`, etc.)
- Autolinking via `expo-autolinking-settings` + `autolinkLibrariesFromCommand` in `android/settings.gradle` (PackageList generated at Gradle build time)

MapLibre does **not** require Google Play Services or a Maps API key. Required manifest permission for tiles: **`INTERNET`** ✅

---

## Commands run

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run test:offline` | ✅ 5/5 pass |
| `npx expo install --check` | ✅ Dependencies up to date |
| `node scripts/verify-maplibre-release.mjs` (post-prebuild, prod env) | ✅ 23 passed, 0 blocking |
| `npx expo prebuild --platform android --clean --no-install` | ✅ Success (manifest verified) |
| `node scripts/ensure-android-release-config.mjs` | ✅ Success |
| `./gradlew assembleRelease` | ⏭ Skipped — no JDK on audit machine |

`node scripts/audit-apk-release.mjs` reported 1 non-map issue (`.env.production` missing locally). CI writes `.env.production` before audits; not a release blocker.

---

## Uncommitted changes required before push

These files contain release-readiness fixes **not yet on the remote branch** and must be committed with the MapLibre migration:

| File | Purpose |
|------|---------|
| `src/components/map/FieldMapView.tsx` | Expo Go–only schematic routing |
| `src/components/map/FieldMapViewMapLibre.tsx` | Native MapLibre implementation |
| `src/components/map/FieldMapViewSchematic.tsx` | Expo Go SVG fallback |
| `src/components/map/FieldMapViewPlaceholder.tsx` | Loading / graceful fallback |
| `src/utils/mapLibreNative.ts` | `isExpoGo()` helper |
| `src/config/mapStyle.ts` | Production demo-style fallback |
| `.github/workflows/android-apk.yml` | Style URL env + verify step |
| `scripts/verify-maplibre-release.mjs` | CI release gate |

Do **not** commit incidental `android/` output from local `expo prebuild`; CI regenerates with `--clean`.

---

## Residual risks (non-blocking)

| Risk | Mitigation |
|------|------------|
| Demo tile host rate limits / downtime | Replace `EXPO_PUBLIC_MAP_STYLE_URL` with self-hosted style before production scale |
| Map shows placeholder if GPS denied / no coords | By design — user-facing message, not a crash |
| No on-device APK smoke test in this audit | Recommend installing CI artifact and opening Day + My Route once |
| Offline tiles | Map shows offline message; GPS/visits still recorded (documented in `MAP_TILE_HOSTING.md`) |

---

## Recommendation

**Ready to push** once the uncommitted files listed above are committed and pushed. The GitHub Actions APK will render the **native MapLibre map**, not the SVG fallback, on Day, My Route, Farmer Map, Tracking, and Visit Preview.

After push, confirm by downloading the workflow artifact and verifying live raster tiles (not the schematic grid) on the Day screen with location enabled.
