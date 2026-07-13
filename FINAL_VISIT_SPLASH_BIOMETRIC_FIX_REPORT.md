# Final Visit / Splash / Biometric / Sync UI Fix Report

**Date:** 2026-07-13  
**Branch:** `main`  
**Verdict:** **Ready for internal QA** (physical-device APK QA on Moto Edge 50 Pro still required before limited client QA)

---

## Summary

Final QA stabilization pass addressing visit draft leakage, success screen layout, duplicate native splash, biometric enrollment persistence, launch unlock, and Sync Status UI consistency. Map engine, Google Maps config, backend APIs, GPS queues, offline sync architecture, and workday business rules were **not** changed.

---

## Root causes

| Issue | Root cause |
|-------|------------|
| Stale observation/recommendation on new visit | `create-step1.tsx` auto-called `loadRevisitPrefill` + `applyRevisitPrefill` whenever a farmer had prior visits; farmer detail also used `fastRevisit: true` |
| Compressed success screen | Two-column row layout with `numberOfLines={2}`, narrow label column, centered card |
| Blue logo before cinematic splash | Native Expo/Android splash showed centered `logo_splash.png` while cinematic splash delayed logo reveal 250ms |
| Biometric asked every login | `signIn` silently called `saveBiometricLogin()` after every password login; enrollment prompt had no dismiss persistence |
| Biometric unlock did not enter app | `handleBiometricLogin` called `retryBootstrap()` (background validation only) instead of establishing authenticated session |
| Sync Status inconsistency | Stacked label/value blocks without status chip hierarchy or row separators |

---

## Files changed

### Visit reset & success
- `mobile/lib/beginNewVisit.ts` (new) — central clean draft entry
- `mobile/app/visit/create-step1.tsx` — removed auto-revisit prefill on farmer pick
- `mobile/app/visit/index.tsx` — `beginNewVisit` on `fresh` + farmer-only prefill
- `mobile/app/visit/create-step4-review.tsx` — `beginNewVisit` after submit; `SubmittedVisitSummary` navigation
- `mobile/app/visit/success.tsx` — row-based summary layout, immutable summary params
- `src/types/submittedVisitSummary.ts` (new)
- `src/navigation/types.ts`, `src/navigation/navigateVisitFlow.ts`
- `mobile/app/farmer/[id].tsx`, `src/screens/FarmerDetailScreen.tsx` — farmer-only prefill (`fresh: true`, no `fastRevisit`)
- `scripts/test-visit-draft-reset.mjs` (new)

### Splash
- `app.config.js` — background-only native splash (no logo image)
- `src/components/brand/KavyaCinematicSplash.tsx` — logo entry delay `0ms`
- `android/app/src/main/res/drawable/splashscreen_icon.xml` (new, transparent)
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/drawable/ic_launcher_background.xml`

### Biometric
- `src/storage/biometricLoginStorage.ts` — `PROMPT_DISMISSED_KEY`, `shouldOfferBiometricEnrollment`, `enableBiometricLoginWithVerification`
- `src/storage/AuthContext.tsx` — `completeBiometricUnlock`, bootstrap biometric gate, removed auto-enable on `signIn`
- `src/screens/LoginScreen.tsx` — one-time enrollment Alert, auto unlock on launch, `completeBiometricUnlock`
- `src/screens/SettingsScreen.tsx` — Profile → Security → Fingerprint login toggle

### Sync UI
- `src/screens/SyncStatusScreen.tsx` — `StatusChip`, section headers, label/value rows
- `src/i18n/en.ts`, `src/i18n/ta.ts` — security, sync, GPS pending strings

---

## Commits

| Hash | Message |
|------|---------|
| `5845989` | fix(visit): reset draft state after successful submission |
| `abadc16` | fix(visit): improve success summary layout *(includes splash native config)* |
| `14271bc` | fix(sync-ui): polish automatic sync status screen |
| `b2e22be` | fix(auth): persist biometric enrollment choice |
| `09dfcbe` | fix(auth): restore biometric unlock on app launch |

---

## Validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run test:offline` | Pass (5/5) |
| `node scripts/test-visit-draft-reset.mjs` | Pass |
| `npx expo install --check` | Dependencies up to date |
| `npx expo-doctor` | 17/18 (pre-existing CNG/native-folder warning) |

---

## Push & APK

| Item | Result |
|------|--------|
| `git push origin main` | **Success** (`3c016f4..09dfcbe`) |
| GitHub Actions APK | **Triggered** — verify at [Actions](https://github.com/Aravindha-k/agri-clinic-mobile/actions). `gh` CLI not available in this environment to poll run status. |
| Fresh APK download | Pending workflow completion — uninstall old APK before installing |

---

## Physical device QA (Moto Edge 50 Pro)

**Not executed in this session** — required before limited client QA:

- [ ] One seamless splash (no duplicate blue logo)
- [ ] Enable fingerprint once; reopen → fingerprint unlock
- [ ] Password login again → no repeated enrollment prompt
- [ ] Complete visit → Add another visit → clean fields
- [ ] Visit success layout (English + Tamil long text)
- [ ] Sync Status screen
- [ ] Map still works
- [ ] No crashes

---

## Remaining risks

1. **APK not device-verified** — verdict capped at internal QA until Moto Edge 50 Pro pass.
2. **Explicit fast revisit** (`fastRevisit: true` from Work queue / farmer list revisit) still prefills prior visit data by design.
3. **Native splash on CI** — Android checked-in resources updated; confirm APK build picks up `splashscreen_icon.xml`.
4. **`GOOGLE_MAPS_ANDROID_API_KEY`** — must remain set in GitHub Actions secrets for map tiles in release APK.

---

## Final verdict

**Ready for internal QA**

Upgrade to **Ready for limited client QA** only after fresh APK passes the Moto Edge 50 Pro checklist above.
