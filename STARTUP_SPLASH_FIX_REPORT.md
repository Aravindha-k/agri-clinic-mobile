# Startup Splash Fix Report

**Date:** 11 July 2026  
**Latest commit:** `fix(mobile): smooth splash continuity and animation timing`

---

## Why the user still perceived two splash screens

| Stage | Visual | Why it felt separate |
|-------|--------|----------------------|
| Native Android / Expo splash | App **icon** (`app_icon.png`) on `#D8ECF8` | Square launcher glyph |
| Cinematic first paint | Solid `#D8ECF8`, then **full-bleed artwork** + logo at **75% Y** | Completely different layout |

Even with a clean handoff (single `KavyaCinematicSplash` mount), the eye reads **icon splash → different branded scene** as two screens.

Also: `App.tsx` hard-capped splash at **3000 ms** and the cinematic often exited as soon as providers finished — sometimes under ~1s of meaningful motion.

---

## Native vs cinematic differences (before)

| Property | Native | Cinematic (old) |
|----------|--------|-----------------|
| Background | `#D8ECF8` | `#D8ECF8` then premium artwork |
| Image | `app_icon.png` @ ~120px | `logo_splash.png` bottom-centered |
| Layout | Centered system splash icon | Ken Burns field photo + lower logo |
| Motion | Static | Fast fade-in of different composition |

---

## What we changed

### Visual continuity

Both first frames are now:

```text
Solid #D8ECF8
Centered Kavya logo_splash.png (~200px)
```

Richer motion (subtle rise + soft bloom + particles) starts **after** that shared static frame.

- `app.config.js` / `brand.config.js` — splash image → `logo_splash.png`, `imageWidth: 200`
- Android `splashscreen_logo.png` densities replaced with `logo_splash.png` (native folders do **not** auto-sync from app.config)
- Cinematic no longer opens on full-bleed artwork

### Timing

| Constant | Value |
|----------|-------|
| **Minimum cinematic visibility** | **2000 ms** from first layout |
| Maximum from first layout | 3500 ms |
| Exit fade | 320 ms |
| Reduced-motion floor | 1200 ms |

Exit requires:

```text
minimum_duration_complete AND providers_ready (fonts + auth restore)
```

Non-critical APIs (dashboard, farmers, visits) do **not** gate the splash.

Providers mount **under** the opaque splash so auth can finish before reveal.

### Callback order (intended)

```text
cinematic_mounted / cinematic_first_layout (0 ms)
→ native splash hidden
→ providers_ready (~auth+fonts)
→ minimum_duration_complete (~2000 ms)
→ cinematic_exit_start
→ cinematic_finished / splash_end
```

---

## Timing before vs after

| | Before | After |
|--|--------|-------|
| Min visible | ~animation only (often &lt;1–1.5s; reduced motion 900ms) | **2000 ms** from first layout |
| Max | App `SPLASH_MAX_MS` 3000 (could cut early) | 3500 from first layout |
| Exit gate | Animation timer alone | `canExit` (critical ready) ∧ min duration |

---

## Files changed

- `App.tsx`
- `AppProviders.tsx` (`CriticalStartupGate`)
- `src/components/brand/KavyaCinematicSplash.tsx`
- `src/components/brand/splashColors.ts`
- `src/config/brand.config.js`
- `app.config.js`
- `src/utils/startupDiagnostics.ts`
- `android/.../drawable-*/splashscreen_logo.png`
- `STARTUP_SPLASH_FIX_REPORT.md`

---

## Verification

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **Passed** |
| `npx expo-doctor` | **Failed** 1/18 — Prebuild vs checked-in native folders (pre-existing). Splash asset was updated **in** `android/` for this reason. |

### Development

- Force-stop + reopen (or reload after `-c`) to see the new sequence.
- Metro `… 81.6%` remains terminal-only, not in-app UI.
- Fast Refresh may skip a full cinematic; use cold start for timing judgment.

### Release / QA APK

- Not rebuilt in this session.
- Native logo files were updated under `android/`; a new native build is required to ship that icon change.
- Expo Go / JS reload will pick up cinematic timing immediately; native first frame needs a rebuild.

---

## Remaining risks

1. Android 12+ circular splash mask may crop `logo_splash` differently than Expo’s contain layout — verify on a physical device after APK build.
2. Soft `providers_ready` timeout (2.5s) can allow exit if auth hangs; max splash still 3.5s.
3. Checked-in `android/` means future splash config in `app.config.js` still needs a manual asset sync or prebuild.
