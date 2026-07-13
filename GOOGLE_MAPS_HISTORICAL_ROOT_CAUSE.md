# Google Maps Historical Root Cause

**Date:** 2026-07-13  
**Scope:** Git history and configuration audit only. No map migration, key addition, or code change.

## 1. Executive Summary

The app's old Google Maps implementation used `react-native-maps` on Android. There was no evidence of a committed Google Maps API key before the crash fix.

The observed "worked before without an obvious key" case is best explained by **Expo Go supplying the native map environment**, not by a hidden committed key. Expo Go runs inside Expo's host app, so it does not use this app's generated `AndroidManifest.xml` for Google Maps metadata.

The GitHub-built APK crashed because it was a standalone Android app mounting `react-native-maps` without:

```xml
<meta-data android:name="com.google.android.geo.API_KEY" android:value="..." />
```

That exact crash was later documented and fixed in `e94a80d` by wiring `GOOGLE_MAPS_ANDROID_API_KEY` into `app.config.js`, GitHub Actions, and a post-prebuild manifest verifier. MapLibre then removed that Google path in `59f4177`.

**Final conclusion:** Previously worked because Expo Go supplied the native map.

## 2. Historical Timeline

| Commit | Date | Map engine | Key source | Build path | Result |
|---|---:|---|---|---|---|
| `9b5dbd9` | 2026-05-29 | `react-native-maps@1.20.1` | None in repo | Expo Go / local native / checked-in Android possible | Real native `MapView`; no explicit key config in `app.config.js` or manifest |
| `289b5dd` | 2026-06-14 | `react-native-maps` | None found | Production mobile release | No `android.config.googleMaps.apiKey`; no manifest key found |
| `5eae673` | 2026-06-19 | `react-native-maps` | None found | GitHub Actions directly built checked-in `android/` | Workflow did not prebuild or export Google key |
| `d062e03` | 2026-07-03 | `react-native-maps` | None found | GitHub Actions ran `expo prebuild --clean`, then Gradle | Regenerated manifest still lacked Google metadata |
| `e94a80d` | 2026-07-12 | `react-native-maps` | `GOOGLE_MAPS_ANDROID_API_KEY` env/secret | `expo prebuild --clean`, manifest patch, verifier | Intended release fix for `API key not found` crash |
| `59f4177` | 2026-07-12 | MapLibre | `EXPO_PUBLIC_MAP_STYLE_URL` | MapLibre prebuild/APK | Removed `react-native-maps`, Google key injection, and Google manifest metadata |
| `734a2de` / `77b34e1` | 2026-07-12 | MapLibre | OpenFreeMap style URL | GitHub APK | Stabilized MapLibre QA path |

## 3. Last Known Google Maps Implementation

Last commit still using Google Maps:

- `e94a80d` — `fix(android): inject Google Maps API key into release builds`

First commit introducing MapLibre:

- `59f4177` — `refactor(map): replace Google Maps with MapLibre`

At `e94a80d`, `src/components/map/FieldMapView.tsx` imported:

- `MapView`
- `Circle`
- `Polyline`

from `react-native-maps`.

It did not import or use `PROVIDER_GOOGLE`. Android therefore used `react-native-maps` default Android provider, which is the Google Maps SDK-backed provider in native Android builds.

## 4. Real Google Map Or Fallback

Before MapLibre, the shared map component was a real native `react-native-maps` `MapView`, not the later SVG route preview.

Evidence:

- `9b5dbd9:src/components/map/FieldMapView.tsx` imports `MapView` from `react-native-maps`.
- No `Route preview` text existed until `59f4177`.
- `FieldMapViewSchematic.tsx` did not exist until the MapLibre migration.
- Historical web fallback text existed only for web: `Map available on Android/iOS app`.

Environment behavior:

| Environment | Historical behavior |
|---|---|
| Expo Go | Could show native maps inside Expo's host app; did not prove this app APK had a key |
| GitHub APK before key wiring | Mounted native `react-native-maps`; crashed if map screen opened and manifest lacked key |
| Local native build with env key | Could work if developer had uncommitted `GOOGLE_MAPS_ANDROID_API_KEY` during prebuild |
| Local native build without env key | Expected to crash when `MapView` mounted |
| MapLibre era Expo Go | SVG schematic only, introduced later |

## 5. Exact API Key Source

Only one real app key source was found in active historical implementation:

| Variable / token | File | Commit | Source type | Notes |
|---|---|---|---|---|
| `GOOGLE_MAPS_ANDROID_API_KEY` | `app.config.js` | `e94a80d` | Environment variable | Read as `process.env.GOOGLE_MAPS_ANDROID_API_KEY` |
| `android.config.googleMaps.apiKey` | `app.config.js` | `e94a80d` | Expo config injection | Set from `GOOGLE_MAPS_ANDROID_API_KEY` |
| `GOOGLE_MAPS_ANDROID_API_KEY` | `.github/workflows/android-apk.yml` | `e94a80d` | GitHub Actions secret | `${{ secrets.GOOGLE_MAPS_ANDROID_API_KEY }}` |
| `com.google.android.geo.API_KEY` | `scripts/ensure-android-release-config.mjs` | `e94a80d` | Generated manifest metadata | Injected after `expo prebuild` |
| `com.google.android.geo.API_KEY` | `scripts/verify-android-maps-config.mjs` | `e94a80d` | Verification target | Checked presence, masked value |

No committed hardcoded Google Maps key was found. No evidence was found for these variable names being real active app config sources before `e94a80d`:

- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_API_KEY`
- `MAPS_API_KEY`
- `ANDROID_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_MAPS_API_KEY`
- `MAPS_API_KEY_ANDROID`
- `GOOGLE_ANDROID_MAPS_KEY`
- `googleMapsApiKey`

Some of those names appeared only in broad audit/doc history searches or as part of later documentation; the implemented key source was `GOOGLE_MAPS_ANDROID_API_KEY`.

## 6. Why Local Appeared To Work

There are two distinct local cases:

1. **Expo Go local testing**
   - Most likely source of the "worked without obvious key" observation.
   - Expo Go uses Expo's own native shell and map environment.
   - It does not validate this app's generated `AndroidManifest.xml`.

2. **Local native build after adding a key**
   - Could work only if `GOOGLE_MAPS_ANDROID_API_KEY` existed in local environment or `.env.local` during `expo prebuild`.
   - The repository intentionally ignores local env files, so that value would not exist in GitHub Actions unless added as a repository secret.

Historical crash-fix docs at `e94a80d` explicitly state the audit machine's local `.env.local` had only API URL values and no `GOOGLE_MAPS_ANDROID_API_KEY`.

## 7. Why GitHub APK Failed

The GitHub APK was a standalone Android app. It did not run inside Expo Go.

Before `e94a80d`, the workflow:

- did not export `GOOGLE_MAPS_ANDROID_API_KEY`;
- did not set `android.config.googleMaps.apiKey`;
- ran `expo prebuild --platform android --clean` from `d062e03` onward;
- produced a regenerated `android/app/src/main/AndroidManifest.xml` with no `com.google.android.geo.API_KEY`;
- built a release APK that crashed when `react-native-maps` created its native `MapView`.

The crash was:

```text
java.lang.IllegalStateException: API key not found
```

That is a native Google Maps SDK manifest error, not a React fallback issue.

## 8. Exact Breaking Change / Configuration Gap

The root configuration gap existed from the first `react-native-maps` implementation:

- `9b5dbd9` added/used `react-native-maps`, but no Google Maps API key config was present.

The GitHub APK failure became reproducible when release builds were generated without a local native manifest/key:

- `d062e03` changed the Android APK workflow to run `npx expo prebuild --platform android --clean --no-install`.
- Because `app.config.js` still did not inject `android.config.googleMaps.apiKey`, clean prebuild regenerated a manifest without the key.

The explicit fix was:

- `e94a80d`, which added `GOOGLE_MAPS_ANDROID_API_KEY` env/secret wiring, config injection, manifest patching, and verification.

The Google path was then removed by:

- `59f4177`, which replaced `react-native-maps` with MapLibre and removed Google key injection/scripts/docs.

## 9. Historical App Config Findings

Before `e94a80d`:

- `app.config.js` had Android package and `queries` for Google Maps intents.
- It did **not** contain `android.config.googleMaps.apiKey`.
- It did **not** read any Google Maps API key environment variable.

At `e94a80d`:

- `app.config.js` read `process.env.GOOGLE_MAPS_ANDROID_API_KEY`.
- It set:

```js
android: {
  config: {
    googleMaps: {
      apiKey: googleMapsAndroidApiKey
    }
  }
}
```

- It added `extra.mapsNativeConfigured`.
- It threw for CI/release/EAS builds when the env var was missing.

At `59f4177`:

- Google Maps config was removed.
- MapLibre plugin and style URL config were added.

## 10. Android Manifest Findings

Checked historical committed manifests:

- `289b5dd:android/app/src/main/AndroidManifest.xml`
- `a18b38d:android/app/src/main/AndroidManifest.xml`
- `d062e03:android/app/src/main/AndroidManifest.xml`
- `e94a80d:android/app/src/main/AndroidManifest.xml`
- `59f4177:android/app/src/main/AndroidManifest.xml`

The committed manifest snapshots inspected did not contain a hardcoded `com.google.android.geo.API_KEY`.

At `e94a80d`, the key was expected to be injected after prebuild by config/plugin and `scripts/ensure-android-release-config.mjs`, not stored in Git.

## 11. GitHub Workflow Findings

Workflow eras:

| Commit | Workflow behavior |
|---|---|
| `5eae673` | Direct Gradle build using checked-in `android/`; no Google key env |
| `d062e03` | `npm ci`, checks, `expo prebuild --clean`, release config, Gradle build; no Google key env |
| `e94a80d` | Added `GOOGLE_MAPS_ANDROID_API_KEY` secret, preflight, post-prebuild manifest verification |
| `59f4177` | Removed Google key secret path; added MapLibre config |
| `77b34e1` | Validated MapLibre QA style and no Google Maps runtime dependency |

There is no evidence that GitHub Actions exported a Google Maps key before `e94a80d`.

## 12. Provider Behavior

Historical code did not use:

- `PROVIDER_GOOGLE`
- `provider={PROVIDER_GOOGLE}`
- `provider={undefined}`

It rendered plain:

```tsx
<MapView ...>
```

On Android native builds, `react-native-maps` uses Google Maps SDK-backed native maps. This explains why the standalone APK needed `com.google.android.geo.API_KEY` even though the JavaScript code did not explicitly say `PROVIDER_GOOGLE`.

## 13. Expo Go Findings

Expo Go checks and schematic routing existed only in the later MapLibre path.

For the old Google Maps path:

- No historical `FieldMapView` Expo Go branch was found.
- `MapView` was imported directly from `react-native-maps`.
- Historical crash-fix docs explicitly state: **Expo Go uses Expo's own Maps key, not the app manifest.**

Therefore Expo Go could make the map appear to work even when a GitHub-built APK had no app-owned Google Maps key.

## 14. Can Old Stable Code Be Restored Safely?

The old Google implementation can be restored only if the Google Maps release contract is restored too:

- `react-native-maps` dependency;
- `android.config.googleMaps.apiKey`;
- `GOOGLE_MAPS_ANDROID_API_KEY` as local/CI/EAS secret;
- post-prebuild verification that manifest contains non-placeholder `com.google.android.geo.API_KEY`;
- screen-level permission safety and coordinate validation retained from current work;
- device QA on the fresh APK.

Restoring only `react-native-maps` components without the key pipeline would reproduce the native crash.

## 15. Recommended Next Action

Do not migrate immediately based only on the old "it worked" observation.

If Google Maps is reconsidered:

1. Treat Expo Go evidence as insufficient for APK readiness.
2. Reintroduce Google only on a branch with secret-backed `GOOGLE_MAPS_ANDROID_API_KEY`.
3. Restore the `e94a80d` validation idea before mounting `MapView` in release APK.
4. Build a fresh GitHub APK and test all map screens.
5. Compare against the current MapLibre APK using the same physical-device matrix.

## Final Conclusion

**Previously worked because Expo Go supplied the native map.**

For standalone APKs, the historical Google Maps implementation required `GOOGLE_MAPS_ANDROID_API_KEY` to be injected into the Android manifest at build time. The GitHub APK failed because that key metadata was absent.
