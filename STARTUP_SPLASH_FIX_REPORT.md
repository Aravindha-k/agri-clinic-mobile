# Startup Splash Fix Report

**Date:** 11 July 2026  
**Commit:** `fix(mobile): restore cinematic splash visibility`

---

## Confirmed reason the cinematic splash was invisible

Two compounding regressions after the native/cinematic continuity work (`4e5e28f` / `60dcd24`):

### 1. App shell painted over the cinematic layer (primary)

`App.tsx` mounted `AppProviders` / `RootNavigator` as a **sibling under** the splash overlay while the splash only used `zIndex` (no Android `elevation`).

On Android, `react-native-screens` native stacks often draw **above** sibling React views that rely on zIndex alone. After `SplashScreen.hideAsync()`:

```text
Native splash hidden
→ user sees login/home (shell)
→ KavyaCinematicSplash still running underneath (opacity 1, but covered)
```

That matches the observed sequence: **blue logo → login/home** with no visible cinematic motion.

### 2. Continuity refactor made motion nearly static (secondary)

`KavyaCinematicSplash` was reduced to a centered logo with ~4% scale and 8px rise on the same blue background. Even when on top, it read as “still the native splash,” then a jump to the app.

---

## Render / state conditions (actual machine)

| Phase | Splash mounted | Shell mounted | Shell opacity | Native splash |
|-------|----------------|---------------|---------------|---------------|
| `cinematic` | yes | yes (for auth/fonts) | **0** (fixed) | held until cinematic ready |
| `revealing` | yes (fading) | yes | 1 | already hidden |
| `app` | no | yes | 1 | hidden |

Exit gate (unchanged intent):

```text
providersReady (fonts + auth) AND minimumCinematicDurationComplete (~2000 ms from first layout)
```

Hard ceiling: **3500 ms** from first layout.

Handoff order (fixed):

```text
cinematic_component_rendered
→ cinematic_first_layout
→ cinematic_animation_started
→ native_splash_hidden
→ providers_ready (whenever)
→ minimum_duration_complete (~2000 ms)
→ cinematic_exit_started
→ app_revealed / cinematic_finished
```

---

## Timing before vs after

| | Before (regression) | After |
|--|---------------------|-------|
| Visible cinematic | Often **0 ms** (covered by shell) | ≥ **2000 ms** from first layout |
| Native hide | On first layout, before anim kickoff | After animation values scheduled |
| Shell during cinematic | Fully opaque native screens | `opacity: 0`, `pointerEvents: none` |
| Motion | Near-static logo | Logo rise/scale + title/subtitle + bloom |

---

## Files changed

- `App.tsx` — hide shell until revealing; Android `elevation` on splash overlay; timing logs
- `src/components/brand/KavyaCinematicSplash.tsx` — visible brand animation; hide native only after anim start; once-per-mount sequence
- `src/utils/startupDiagnostics.ts` — new phase names for timing logs
- `STARTUP_SPLASH_FIX_REPORT.md` — this update

**Not changed:** auth, GPS, sync, native splash assets, `preventAutoHide` single-call guard.

---

## Animation values reviewed

| Value | Entry | Motion | Exit |
|-------|-------|--------|------|
| `screenOpacity` | 1 | hold | → 0 (320 ms) |
| `logoOpacity` | 1 (matches native) | hold | via screen |
| `logoScale` | 1 | → 1.08 | — |
| `logoTranslateY` | 0 | → −18 → −10 | — |
| `titleOpacity` | 0 | → 1 | — |
| `subtitleOpacity` | 0 | → 1 | — |
| `bloomOpacity` | 0 | → 0.34 → 0.16 | — |
| `exitWash` | 0 | — | → 1 |

Shared values reset on cold mount. Animation effect starts **once** per layout generation (callback refs avoid restart/cancel from parent re-renders).

Reduced-motion path still reveals title/subtitle (no frozen logo-only splash).

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **Passed** |
| `npx expo-doctor` | **17/18** — pre-existing Prebuild vs checked-in `android/`/`ios` |

### Cold-start result

Code-level fix is in place. Validate on device with:

1. Force-stop → remove from recents → reopen  
2. Watch Metro `[Startup]` logs for the sequence above  
3. Confirm title/subtitle appear after the shared first frame  

Fast Refresh alone is **not** sufficient.

### Release APK result

Not rebuilt in this session. JS layering/animation fix applies on next JS load; no native splash asset change required for this visibility fix.

---

## Remaining risks

1. If a future change remounts a second splash in login/providers, duplicate splash can return — keep a single mount in `App.tsx`.
2. Soft `providers_ready` timeout (2.5s) can still allow exit if auth hangs; max splash remains 3.5s.
3. Android 12+ splash icon mask may still crop the native logo differently than Expo — separate from cinematic visibility.
