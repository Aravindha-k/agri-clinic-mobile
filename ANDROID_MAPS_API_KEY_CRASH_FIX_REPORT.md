# Android Maps API key crash — fix report

**Date:** 2026-07-12  
**Package:** `com.kavya.agriclinic`  
**Commit:** `fix(android): inject Google Maps API key into release builds`

---

## Confirmed crash

**adb logcat (release QA APK):**

```text
java.lang.IllegalStateException: API key not found. Check that
<meta-data android:name="com.google.android.geo.API_KEY"
android:value="your API key"/>
is in the <application> element of AndroidManifest.xml
```

**Native stack:**

```text
com.google.android.gms.maps.MapView.onCreate
  → com.rnmaps.maps.MapView
  → Day / My Route / travel map screens
```

Any screen mounting `react-native-maps` `MapView` crashed immediately on cold start of the map.

---

## Root cause

1. **`app.config.js` did not set `android.config.googleMaps.apiKey`** from any environment variable.
2. **No `GOOGLE_MAPS_ANDROID_API_KEY` anywhere in the repo** (no `.env.example` entry, no GitHub Actions secret wiring).
3. **Checked-in `android/app/src/main/AndroidManifest.xml` had no `com.google.android.geo.API_KEY` meta-data.**
4. **GitHub Actions** runs `npx expo prebuild --platform android --clean` then `assembleRelease`, but without the Expo config key the regenerated manifest still lacked Maps metadata → fatal native crash in QA APK.

---

## Why local development appeared to work

| Scenario | Behavior |
|----------|----------|
| **Expo Go** | Uses Expo’s own Maps key — not the app manifest. |
| **`expo start` + dev client without opening maps** | No `MapView.onCreate` — crash not triggered. |
| **Local `.env.local`** | Currently had `EXPO_PUBLIC_DEV_API_URL` only — **no** `GOOGLE_MAPS_ANDROID_API_KEY` on the audit machine. Maps would crash on a local release/dev-client build that mounts `MapView` without prebuild + key. |
| **Historical local builds** | If a developer had a key in an uncommitted env file and ran prebuild locally, manifest would have been injected only on that machine — never in CI. |

---

## Why GitHub Actions failed

The **Android APK** workflow (`.github/workflows/android-apk.yml`):

- Set production API env vars ✓
- Did **not** export `GOOGLE_MAPS_ANDROID_API_KEY` ✗
- Did **not** preflight the secret ✗
- Ran prebuild without Maps config → manifest without API key ✗
- Built and shipped APK that crashes on Day tab ✗

---

## Fix summary

| Area | Change |
|------|--------|
| **Canonical env var** | `GOOGLE_MAPS_ANDROID_API_KEY` (native only, not `EXPO_PUBLIC_*`) |
| **`app.config.js`** | `android.config.googleMaps.apiKey`, build-time validation for CI/production/EAS, `extra.mapsNativeConfigured` flag |
| **`.env.example`** | Safe placeholder |
| **`scripts/verify-android-maps-config.mjs`** | Post-prebuild manifest check; masks key in logs |
| **`scripts/ensure-android-release-config.mjs`** | Ensures/injects meta-data from env during CI (defense in depth) |
| **GitHub Actions** | Secret env, preflight step, verify step after prebuild |
| **`FieldMapView`** | Defensive fallback — do not mount `MapView` when `mapsNativeConfigured === false` |
| **Docs** | `GOOGLE_MAPS_ANDROID_SETUP.md` (GCP + SHA-1 + secret instructions) |

---

## Files changed

- `app.config.js`
- `.env.example`
- `.github/workflows/android-apk.yml`
- `package.json` — `verify:android-maps` script
- `scripts/verify-android-maps-config.mjs` *(new)*
- `scripts/ensure-android-release-config.mjs`
- `scripts/audit-apk-release.mjs`
- `src/utils/mapsNativeConfig.ts` *(new)*
- `src/components/map/FieldMapView.tsx`
- `GOOGLE_MAPS_ANDROID_SETUP.md` *(new)*
- `ANDROID_MAPS_API_KEY_CRASH_FIX_REPORT.md` *(this file)*

**Not changed:** map UI layout, Day navigation, GPS logic, backend APIs, route data.

---

## GitHub secret required

**Name:** `GOOGLE_MAPS_ANDROID_API_KEY`  
**Where:** Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**  
**Value:** Valid Google Maps Android API key (Maps SDK for Android enabled)

Then **re-run** the **Android APK** workflow.

The workflow fails fast with a clear message if the secret is missing — it never logs the key value.

---

## Manifest verification result

**Before fix (checked-in manifest):**

```text
[verify-android-maps-config] Missing <meta-data android:name="com.google.android.geo.API_KEY" …/>
```

**After fix — `expo prebuild` with `GOOGLE_MAPS_ANDROID_API_KEY` set (test key on audit machine, not committed):**

```text
[verify-android-maps-config] OK — com.google.android.geo.API_KEY present (28 chars, AaBb…MmNn)
```

Expo prebuild correctly injected:

```xml
<meta-data android:name="com.google.android.geo.API_KEY" android:value="…"/>
```

inside `<application>`.

---

## Verification commands (audit machine)

| Check | Result |
|-------|--------|
| `npm run typecheck` | **Pass** |
| `npm run test:offline` | **Pass** (5/5) |
| `npx expo install --check` | **Pass** — dependencies up to date |
| `npx expo-doctor` | **17/18** — expected prebuild/CNG notice (native folders present) |
| `node scripts/audit-apk-release.mjs` | **31/32** — pre-existing `.env.production` TLS placeholder issue (unrelated) |
| `node scripts/verify-android-maps-config.mjs` | **Fail** on checked-in manifest (expected); **Pass** after prebuild with key |
| Production config without key | **Throws:** `GOOGLE_MAPS_ANDROID_API_KEY is required for Android APK builds` |
| `gradlew assembleDebug` | **Skipped** — `JAVA_HOME` not set on audit machine |
| Physical device / adb logcat | **Pending** — requires JDK build + device with GitHub secret configured |

---

## Remaining Google Cloud requirements

After adding the GitHub secret, ensure the API key in Google Cloud Console has:

1. **Maps SDK for Android** enabled  
2. **Application restriction:** Android apps  
3. **Package name:** `com.kavya.agriclinic`  
4. **SHA-1** for the signing certificate used by the APK:
   - QA APK from GitHub Actions: `android/app/debug.keystore` (see `GOOGLE_MAPS_ANDROID_SETUP.md` for `keytool` command)

If the key is present in the manifest but restrictions are wrong, expect **blank maps or auth errors** — not the `API key not found` crash.

---

## Device test checklist (post-secret + workflow rerun)

1. Cold start  
2. Start Workday  
3. Tap **Day**  
4. Open **My Route**  
5. Open every map screen  
6. Switch tabs repeatedly  
7. Map with no route / one point / multiple points  
8. Minimize and reopen  

Confirm logcat no longer shows `IllegalStateException: API key not found`.

---

## Safe fallback behavior

If a build is assembled without a key (should be blocked by CI), `FieldMapView` reads `extra.mapsNativeConfigured` and shows:

> Map configuration is unavailable in this build.

Day summary and End Workday remain accessible. This does **not** replace the manifest fix — native `MapView.onCreate` can crash before React error boundaries run when the key is completely absent.
