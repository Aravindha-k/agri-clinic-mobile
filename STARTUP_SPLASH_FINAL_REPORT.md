# Startup Splash Final Report

**Date:** 2026-07-12  
**Commit:** `726bcb4` — `fix(mobile): restore product cinematic splash experience`  
**Branch:** `main`

---

## Regression cause (confirmed)

The premium agriculture product splash regressed in two ways:

1. **Local/dev simplification of `App.tsx`** (logo-only fast path) removed the cinematic coordinator in some working trees — native splash hid after ~1.8s with no product artwork sequence.
2. **`KavyaCinematicSplash` motion design** emphasized an aggressive logo zoom loop (`0.92 ↔ 1.10`) while the **background image was static**, making the experience feel like “logo on blue” instead of a cinematic product reveal.

The approved assets were never deleted. `assets/splash/premium_background.png` and `assets/brand/logo_splash.png` remained wired via `splashAssets.ts`.

---

## Old approved asset restored

| Asset | Path | Role |
|-------|------|------|
| Agriculture product background | `assets/splash/premium_background.png` | Full-screen cover art (seeds, products, sky) |
| Kavya logo | `assets/brand/logo_splash.png` | Centered brand mark on sunburst focal area |
| Native splash color | `#D8ECF8` (`CINEMATIC_SPLASH_BG`) | Matches first cinematic frame |

No source images were modified.

---

## Files changed

| File | Change |
|------|--------|
| `App.tsx` | Restored single cinematic coordinator; preload bundled splash images; native hide only from `onReady` |
| `src/components/brand/KavyaCinematicSplash.tsx` | Ken Burns background, readability gradient, gentle logo entry/breathe |
| `src/components/brand/splashColors.ts` | Updated timing constants |
| `AppProviders.tsx` | Soft critical-ready ceiling aligned to cinematic min hold (2800 ms) |

**Not touched:** maps, GPS, offline sync, workday, auth logic, navigation, APIs.

---

## Final visual structure

```
Layer 1 — premium_background.png (cover, Ken Burns zoom)
Layer 2 — LinearGradient blue/green readability overlay
Layer 3 — Logo + title + subtitle on sunburst focal point (~75% Y)
```

---

## Animation timings

| Phase | Timing |
|-------|--------|
| Native handoff | 320 ms after first layout (background painted) |
| Background Ken Burns | Scale `1.00 → 1.045 → 1.00`, translateY `0 → -4 → 0`, **6200 ms** cycle, ease-in-out loop |
| Logo entry delay | 250 ms |
| Logo opacity | `0 → 1` over **900 ms** |
| Logo scale | `0.94 → 1.02 → 1.00` then subtle breathe `1.00 ↔ 1.025` |
| Logo translateY | `8 → 0` over **900 ms** |
| Title / subtitle | 520–1220 ms stagger (unchanged) |
| Minimum cinematic hold | **1900 ms** after first layout |
| Exit fade | **450 ms** wash to `#F8F7F2` |
| Hard ceiling | 6500 ms |

### Reduce Motion

- Background Ken Burns **disabled** (static artwork)
- Logo: short fade + smaller motion only
- Minimum hold shortened slightly (~1600 ms floor)

---

## Fallback behavior

| Condition | Behavior |
|-----------|----------|
| Background image load error | Solid `#D8ECF8` fallback + logo/title still shown |
| Providers boot error | Critical ready → splash can exit normally |
| Asset preload failure | Non-blocking; bundled `require()` still resolves locally |
| Native splash | Hidden once via `hideNativeSplashSafe` from cinematic `onReady` only |

---

## Validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass (pre- and post-commit) |
| `npm run test:offline` | ✅ 5/5 |
| `npx expo install --check` | ✅ |
| `npx expo-doctor` | ⚠️ 17/18 (pre-existing prebuild/CNG advisory — unchanged) |

---

## Git push result

```
726bcb4 fix(mobile): restore product cinematic splash experience
Pushed to origin/main (964a232..726bcb4)
```

---

## GitHub Actions result

| Item | Value |
|------|-------|
| Workflow | Android APK #25 |
| Run | [29190204756](https://github.com/Aravindha-k/agri-clinic-mobile/actions/runs/29190204756) |
| Status | ✅ **success** |
| Artifact | `Kavya_Agri_Clinic_Client_QA_v1.0.1.apk` |

---

## Physical device result

**Not verified on Moto Edge 50 Pro in this session** — install the CI artifact after uninstalling the previous build and confirm:

- Agriculture product artwork visible immediately after native splash
- Slow background zoom (not logo-only blue screen)
- Logo fade/rise, then smooth transition to login/home

---

## Expected cold-start sequence

```
Native splash (#D8ECF8 + logo_splash.png)
→ product background visible (premium_background.png)
→ slow Ken Burns zoom on products
→ Kavya logo fades in over sunburst
→ ~1.9s premium hold
→ 450ms fade to login/home
```

---

## Verdict

**Cinematic product splash restored in code and CI.** APK artifact is available from run #25. Confirm on device for final sign-off.
