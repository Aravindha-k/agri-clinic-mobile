# Startup Splash Fix Report

**Date:** 11 July 2026  
**Repo:** `d:\agri-clinic-mobile`  
**Commit message:** `fix(mobile): unify native and cinematic splash handoff`

---

## Confirmed duplicate loader sources

| Source | Role | Overlap issue |
|--------|------|----------------|
| **Android / Expo native splash** (`Theme.App.SplashScreen`, `expo-splash-screen`, bg `#D8ECF8` + icon) | Shown while JS loads | Stayed up while cinematic also painted; bg was `#B8DCF5` vs native `#D8ECF8` → flash / “two splash” feel |
| **`KavyaCinematicSplash`** | Branded animation | Mounted as overlay **and** `AppProviders` mounted underneath immediately |
| **Auth / nav gate** (`RootNavigator` when `!isReady`) | Blank cream shell | Could appear under a fading / mismatched splash |
| **`AppProviders.onShellReady` → `hideNativeSplashSafe("app_shell_ready")`** | Second hide path | Competed with cinematic ready (idempotent hide, but confusing lifecycle) |
| **Metro / Expo bundling progress** (`Android … 81.6%`) | Terminal / Expo tooling only | **Not an in-app UI loader** — must not be treated as a second progress bar in release |

`KavyaCinematicSplash` itself has **no** progress bar. Deprecated `AnimatedSplashScreen` / `BrandedLoader` were **not** mounted on the live path. Duplicate mounting of cinematic was **not** found (single mount from `App.tsx`).

Primary in-app duplication: **native splash + cinematic**, compounded by **shell mounting under splash**, **background color mismatch**, and **dual hide triggers**.

---

## Files changed

| File | Change |
|------|--------|
| `App.tsx` | Startup phase machine: `cinematic` → `revealing` → `app`; defer shell until exit fade; single hide via cinematic layout |
| `src/bootstrap/nativeSplash.ts` | Module-level `holdNativeSplash()`; idempotent hide; `native_splash_hidden` log |
| `src/components/brand/KavyaCinematicSplash.tsx` | `onLayout` → `onReady`; `onExitStart`; bg = native `#D8ECF8`; quieter logs |
| `src/components/brand/splashColors.ts` | **New** — shared splash / exit wash colors |
| `src/utils/startupDiagnostics.ts` | Info logs in `__DEV__`; warnings only for errors; no API URL spam in release |
| `src/hooks/useAppSplash.ts` | Deprecated auto-hide on mount |
| `AppProviders.tsx` | Comment: do not hide native splash from shell |
| `src/navigation/RootNavigator.tsx` | Comment: no spinner while auth hydrates |
| `STARTUP_SPLASH_FIX_REPORT.md` | This report |

---

## Previous startup sequence

```text
Native splash (hold)
→ App mounts; cinematic overlay + AppProviders both live
→ hideAsync from cinematic useEffect AND/OR app_shell_ready
→ Cinematic animates (bg #B8DCF5 ≠ native #D8ECF8)
→ splash_end → remove overlay → login/home
```

Visible defects: color flash, stacked shells, warning-level “success” logs, possible dual splash logos during handoff.

---

## New startup sequence

```text
1. native-loading
   preventAutoHideAsync (once, module import + App)
   Native Android splash only

2. cinematic
   Mount KavyaCinematicSplash only (Providers prefetched, not mounted)
   onLayout → hideAsync once (idempotent)
   Solid #D8ECF8 matches native → artwork/logo animation
   No auth UI / no ScreenLoader / no second progress bar

3. revealing
   onExitStart → mount AppProviders under fading splash
   Auth may hydrate under exit wash (cream) — no ActivityIndicator

4. app-ready
   onFinish → remove splash overlay
   Login or authenticated tabs
```

Expected logs (dev):

```text
[Startup] first_render
[Startup] native_splash_hold
[Startup] splash_start
[Startup] cinematic_mounted
[Startup] cinematic_ready
[Startup] native_splash_hide_attempt — cinematic_first_layout
[Startup] native_splash_hidden — cinematic_first_layout
[Startup] app_ready — cinematic_exit_start
[Startup] cinematic_finished
[Startup] splash_end — cinematic finished
```

One cinematic mount / one finish per cold start (replay on sign-out resets intentionally).

---

## Duplicate mounting

| Check | Result |
|-------|--------|
| Cinematic from App + AppProviders? | **No** — only `App.tsx` |
| Cinematic from Login / auth gate? | **No** |
| Nested layout remount? | **No** evidence |

---

## Verification commands

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **Passed** (exit 0) |
| `npx expo-doctor` | **Failed** 1/18 — Prebuild vs checked-in `android/`/`ios` config sync (pre-existing; unrelated to splash) |

---

## Development-build observation

- Metro line `Android … %` is **bundler progress**, not app UI.
- Expo Go / dev client may still show a **temporary native loading overlay while the bundle loads** before JS owns the screen — expected in development; not claimed fixed for Expo tooling chrome.
- After this fix, in-app sequence should be: native splash → one cinematic → app.

**Release/QA APK:** Not retested in this change set. Do not claim release is free of Expo/dev overlays without an APK cold start.

---

## Remaining risks

1. **Expo Go / metro overlay** can still appear during slow bundles in development.  
2. **Native splash icon** (app icon) vs **cinematic logo** (`logo_splash.png`) are different assets — sequential, not simultaneous after handoff; product may later align icons.  
3. If `AppProviders` import is slow after timeout, user may briefly see splash-colored empty shell.  
4. Sign-out splash replay remounts cinematic once (by design).  
5. `expo-doctor` Prebuild sync warning remains a separate infra issue.

---

## Manual test checklist

- [ ] Fresh install cold start  
- [ ] Logged out  
- [ ] Logged in  
- [ ] Slow JS bundle (dev)  
- [ ] Background / resume (no second cinematic)  
- [ ] Offline startup  
- [ ] Dev client  
- [ ] Release/QA APK (when available)
