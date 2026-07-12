# Google Maps Android API key setup

The Agri Clinic Field app uses **react-native-maps** on Android. The native Google Maps SDK requires an API key in `AndroidManifest.xml` under:

```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="…"/>
```

If this metadata is missing, opening any map screen (Day tab, My Route, travel maps) crashes with:

```text
java.lang.IllegalStateException: API key not found.
```

The key is injected at build time from the environment variable **`GOOGLE_MAPS_ANDROID_API_KEY`**. It is **not** committed to Git and is **not** exposed via `EXPO_PUBLIC_*` variables.

---

## 1. Create / configure the key in Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Create or edit an **API key** for Android.
3. Enable **Maps SDK for Android** for the project (APIs & Services → Library).
4. Restrict the key:
   - **Application restrictions:** Android apps
   - **Package name:** `com.kavya.agriclinic`
   - **SHA-1 certificate fingerprint:** see section 2 below (use the fingerprint that matches how the APK is signed)

If the key exists but restrictions are wrong, maps usually show blank tiles or an authorization error — **not** the fatal “API key not found” crash. That crash means the manifest metadata was never injected.

---

## 2. Obtain SHA-1 fingerprints

Use `keytool -list -v` on the keystore that signs the APK you install.

### Debug keystore (local `expo run:android`, CI client QA APK)

GitHub Actions release builds are signed with the **debug keystore** for client QA (`scripts/ensure-android-release-config.mjs`).

```bash
keytool -list -v \
  -keystore android/app/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android
```

Copy the **SHA-1** line into the Google Cloud Android restriction.

Default Android debug SHA-1 (if you use the standard `~/.android/debug.keystore` instead):

```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android
```

### Production / upload keystore

When you move to a production signing keystore, run the same command with your release keystore path, alias, and passwords (never commit keystores or passwords):

```bash
keytool -list -v \
  -keystore /path/to/release.keystore \
  -alias YOUR_ALIAS
```

Add that SHA-1 to the same API key restriction (or use a separate key per signing cert).

### GitHub Actions signing certificate

The workflow at `.github/workflows/android-apk.yml` signs with `android/app/debug.keystore` after prebuild. Use the **debug keystore SHA-1** from `android/app/debug.keystore` for QA APKs built by Actions.

---

## 3. Local development

1. Copy `.env.example` → `.env.local` (`.env.local` is gitignored).
2. Set your real key:

   ```env
   GOOGLE_MAPS_ANDROID_API_KEY=your_actual_key_here
   ```

3. Regenerate native Android project when the key changes:

   ```bash
   npx expo prebuild --platform android --clean
   node scripts/verify-android-maps-config.mjs
   ```

4. Build or run:

   ```bash
   npm run android
   # or
   cd android && ./gradlew assembleDebug
   ```

Expo loads `.env.local` when evaluating `app.config.js`. Production/CI builds **fail** if `GOOGLE_MAPS_ANDROID_API_KEY` is missing when `EXPO_PUBLIC_ENV=production`, `GITHUB_ACTIONS=true`, or `EAS_BUILD=true`.

---

## 4. GitHub Actions secret

1. GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. **Name:** `GOOGLE_MAPS_ANDROID_API_KEY`
4. **Value:** your valid Google Maps Android API key
5. Re-run the **Android APK** workflow

The workflow preflights the secret (without logging it), runs `expo prebuild`, applies release config, and verifies the manifest before `assembleRelease`.

---

## 5. EAS Build (optional)

For `eas build`, add **`GOOGLE_MAPS_ANDROID_API_KEY`** as an EAS project secret or environment variable in the [Expo dashboard](https://expo.dev). It is read by `app.config.js` during the EAS prebuild the same way as GitHub Actions.

---

## 6. Verification

After prebuild:

```bash
npm run verify:android-maps
```

Expected output (masked, no full key):

```text
[verify-android-maps-config] OK — com.google.android.geo.API_KEY present (39 chars, AIza…xyz9)
```

On device, confirm Day → My Route and all map screens open without `IllegalStateException: API key not found` in `adb logcat`.
