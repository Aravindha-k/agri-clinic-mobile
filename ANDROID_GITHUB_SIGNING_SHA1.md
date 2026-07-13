# Android GitHub Actions signing — SHA-1 reference

**Repository:** `agri-clinic-mobile`  
**Workflow:** `.github/workflows/android-apk.yml`  
**Date inspected:** 2026-07-13

---

## 1. Signing mode

**Default debug keystore**

The GitHub APK workflow does **not** use a custom release keystore from GitHub Secrets. There are **no** repository secrets for keystore file, alias, store password, or key password.

| Check | Finding |
|-------|---------|
| `.github/workflows/android-apk.yml` | Only secret: `GOOGLE_MAPS_ANDROID_API_KEY` (Maps SDK, not signing) |
| `scripts/ensure-android-release-config.mjs` | Patches `release` to use `signingConfigs.debug` |
| `android/app/build.gradle` | `signingConfigs.debug` → `android/app/debug.keystore`, alias `androiddebugkey` |
| `android/gradle.properties` | No signing / keystore properties |
| Build command | `./gradlew assembleRelease` (signed release APK) |

Flow: `expo prebuild --clean` → `ensure-android-release-config.mjs` → `assembleRelease` with **debug keystore on release build type**.

---

## 2. Package name

```
com.kavya.agriclinic
```

(`applicationId` / `namespace` in `android/app/build.gradle`)

---

## 3. Certificate fingerprints (GitHub-built APK)

Derived from `android/app/debug.keystore` (standard Android debug certificate):

| Field | Value |
|-------|--------|
| **Alias** | `androiddebugkey` |
| **SHA-1** | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| **SHA-256** | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |

Use this **SHA-1** in Google Cloud when restricting the Maps API key for APKs built by GitHub Actions.

---

## 4. Safe commands (no secrets printed)

### From keystore (after prebuild)

Interactive — keytool prompts for passwords; nothing echoed:

```bash
keytool -list -v \
  -keystore android/app/debug.keystore \
  -alias androiddebugkey
```

### From keystore (CI / scripted, fingerprints only)

```bash
node scripts/print-signing-cert-fingerprints.mjs
```

Prints only `Alias name`, `SHA1`, and `SHA256` lines.

### From built APK (no keystore or passwords)

After `assembleRelease`:

```bash
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
```

On GitHub Actions runners, `apksigner` is under `$ANDROID_HOME/build-tools/<version>/`.

---

## 5. GitHub Actions fingerprint step (temporary)

Added after **Apply Android release config**:

```yaml
- name: Print signing certificate fingerprints (safe)
  run: node scripts/print-signing-cert-fingerprints.mjs
```

Example log output:

```text
=== APK signing certificate (fingerprints only) ===
Alias name: androiddebugkey
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
SHA256: FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

Remove this step once fingerprints are confirmed in a successful workflow run.

---

## 6. If switching to a custom release keystore later

1. Store the keystore as a GitHub secret (e.g. base64-encoded file) — **never commit it**.
2. Decode to a temp file in CI only.
3. Obtain fingerprints without logging passwords:

   ```bash
   keytool -list -v -keystore /path/to/release.keystore -alias YOUR_ALIAS
   ```

   Enter passwords at the prompt (not in the command line).

4. Restrict Google Cloud API keys to the **new** SHA-1 for the certificate that actually signs distributed APKs.

---

## Summary

| Item | Value |
|------|--------|
| Signing mode | Default debug keystore |
| Package | `com.kavya.agriclinic` |
| Keystore file | `android/app/debug.keystore` |
| Alias | `androiddebugkey` |
| SHA-1 (GitHub APK) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
