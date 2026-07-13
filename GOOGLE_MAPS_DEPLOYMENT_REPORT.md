# Google Maps deployment report

**Date:** 2026-07-13  
**Branch:** `main`  
**Verdict:** Ready for GitHub secret + APK build

---

## Status summary

| Item | Status |
|------|--------|
| Map engine | `react-native-maps@1.20.1` (Google Maps) |
| MapLibre runtime | Removed — no package, no source imports, no config plugin |
| Shared map component | `src/components/map/FieldMapView.tsx` |
| API key injection | `GOOGLE_MAPS_ANDROID_API_KEY` → `app.config.js` → AndroidManifest |
| Hardcoded key in repo | None |
| GitHub secret | **Must be added manually** (CLI not authenticated on this machine) |

---

## What changed in this push

| File | Purpose |
|------|---------|
| `.github/workflows/android-apk.yml` | Safe step prints SHA-1 / SHA-256 / alias only (no passwords) |
| `scripts/print-signing-cert-fingerprints.mjs` | Fingerprint printer for CI |
| `ANDROID_GITHUB_SIGNING_SHA1.md` | Signing mode + SHA-1 reference for Maps key restriction |
| `GOOGLE_MAPS_DEPLOYMENT_REPORT.md` | This report |

**Not included:** `src/storage/AuthContext.tsx` (unrelated splash work), `.env.local` (gitignored), generated `android/` prebuild output.

---

## MapLibre cleanup verification

Confirmed on disk and in `git ls-files`:

- No `@maplibre/maplibre-react-native` in `package.json`
- No `FieldMapViewMapLibre.tsx`, `mapLibreNative.ts`, `mapStyle.ts`, or MapLibre verifier tracked
- All map screens use shared `FieldMapView`: Day, My Route, Tracking, Farmer, Visit preview
- Local `.env.local` MapLibre style URL removed (file remains gitignored)

Historical MapLibre mentions remain only in investigation/docs (e.g. `GOOGLE_MAPS_HISTORICAL_ROOT_CAUSE.md`).

---

## API key pipeline (CI)

1. Workflow env: `GOOGLE_MAPS_ANDROID_API_KEY: ${{ secrets.GOOGLE_MAPS_ANDROID_API_KEY }}`
2. Preflight fails clearly if secret is empty (value never logged)
3. `npx expo prebuild` reads env via `app.config.js` → `android.config.googleMaps.apiKey`
4. `ensure-android-release-config.mjs` ensures manifest metadata
5. `verify-android-maps-config.mjs` + `verify-google-maps-release.mjs` must pass before Gradle

Manifest target:

```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="…" />
```

---

## Where to add the GitHub secret

1. Open: https://github.com/Aravindha-k/agri-clinic-mobile  
2. **Settings** → **Secrets and variables** → **Actions**  
3. **New repository secret**  
4. **Name:** `GOOGLE_MAPS_ANDROID_API_KEY`  
5. **Value:** paste your Maps Android API key (the one you created in Google Cloud)  
6. Save  

Do **not** commit the key to git, `.env`, `app.config.js`, or `AndroidManifest.xml`.

Optional CLI (after `gh auth login`):

```bash
gh secret set GOOGLE_MAPS_ANDROID_API_KEY
# paste key at prompt, Enter, Ctrl+D / Ctrl+Z
```

---

## Local validations (this session)

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run test:offline` | Pass (5/5) |
| `npx expo prebuild --platform android --clean` | Pass (temporary non-secret test value) |
| `verify-android-maps-config.mjs` | Pass |
| `verify-google-maps-release.mjs` | Pass (19/19) |
| Gradle `assembleRelease` | Not run locally — CI runs it |

---

## Signing (for Maps key restriction)

| Field | Value |
|-------|--------|
| Mode | Default debug keystore on release APK |
| Package | `com.kavya.agriclinic` |
| SHA-1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |

Matches your Google Cloud Android restriction.

---

## After APK builds — device QA checklist

1. Uninstall old APK → install fresh GitHub artifact  
2. Splash screen animation  
3. Login  
4. Grant location → enable device GPS  
5. Start Workday  
6. Day screen (no false “Could not end workday”)  
7. My Route — street map, route polyline, start/visit/end markers  
8. Visit FAB → Visit flow / visit map  
9. Farmer Map — farmer marker, no live-dot required  
10. GPS tracking continues; route updates  
11. Deny location permission: map still opens, stored markers show, no live user dot, **no crash**  
12. `adb logcat` — no `API key not found`, no `AndroidRuntime` fatal from maps  

---

## Security note

The API key was shared in chat for setup. Prefer adding it only as a GitHub Actions secret. If this chat may be shared, rotate the key in Google Cloud and update the repository secret.

---

## Blocker until secret is set

GitHub Actions will fail at **Preflight Google Maps Android API key** until `GOOGLE_MAPS_ANDROID_API_KEY` exists in repository Actions secrets. After adding it, re-run **Android APK** (workflow_dispatch or push).
