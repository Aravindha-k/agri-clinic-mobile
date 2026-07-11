# Startup Splash Fix Report — Logo Orbit Ring

**Date:** 11 July 2026  
**Commit:** `fix(mobile): restore splash logo orbit animation`

---

## Confirmed reason the circular animation was invisible

**Root cause: the orbit/ring was never mounted.**

`KavyaCinematicSplash` animated logo scale/rise, a soft bloom pulse, golden upward particles, and title/subtitle — but **no rotating ring, dashed stroke, or orbiting accent** existed in the cinematic tree.

What users saw:

```text
Native blue splash
→ cinematic logo (visible)
→ no circular motion (component missing)
→ exit to app
```

This was not primarily a clipping / reduced-motion / Fast Refresh stuck-value issue. Those were checked; the animation technology simply was not present on the splash path.

Secondary notes (not the main failure):

| Check | Result |
|-------|--------|
| `overflow: hidden` on logo wrap | Would have clipped a child ring — orbit is now a sibling under a visible cluster |
| Reduced motion | Can disable particles; splash previously had no ring to disable |
| Timing | Min cinematic duration already ~2000 ms — enough for a visible partial/full rotation once the ring exists |

---

## Animation technology used

| Item | Choice |
|------|--------|
| Library | **Reanimated** (`useSharedValue`, `withRepeat`, `withTiming`, `withDelay`, `cancelAnimation`) |
| Ring graphics | **SVG** `Circle` with `strokeDasharray` (dashed green track + gold highlight arc) |
| Accent | Small glowing **orbit dot** on the primary ring |
| Secondary motion | Counter-rotating thin gold arc (~1.35× period) |
| Not used | Lottie, RN `Animated.loop`, ActivityIndicator |

New component: `src/components/brand/SplashLogoOrbit.tsx`

---

## Timing before vs after

| | Before | After |
|--|--------|-------|
| Ring mounted | **No** | Yes, after `layoutReady` |
| Ring start | N/A | `STATIC_HOLD_MS` (300 ms) after first layout |
| Rotation period | N/A | **2200 ms** linear `0→360deg`, infinite |
| Visible cinematic floor | ~2000 ms | Unchanged (~2000 ms) — ≥1 meaningful rotation window |
| Native hide | After cinematic anim kickoff | Unchanged |
| Exit | After min duration ∧ `canExit` | Unchanged |

Sequence:

```text
cinematic_first_layout
→ cinematic_animation_started
→ ring_rendered / ring_layout / ring_animation_started (+300 ms fade-in)
→ native_splash_hidden
→ minimum_duration_complete (~2000 ms)
→ cinematic_exit_started
→ ring_animation_stopped (unmount)
→ cinematic_finished
```

---

## Visibility and clipping

| Issue | Fix |
|-------|-----|
| No ring component | Added `SplashLogoOrbit` |
| Logo rise leaving a static ring behind | Logo + orbit share one `logoStyle` transform cluster |
| Clip risk | Cluster / logo layer / screen use `overflow: "visible"`; ring diameter = `logoSize * 1.48` |
| Contrast on `#D8ECF8` | Forest-green dashed stroke + gold highlight + gold orbit dot |
| Behind logo | Orbit `zIndex: 2`, logo inner `zIndex: 5` |
| Reduced motion | Static soft ring + halo; no spin |

Dev logs (kept as quiet startup phases, not per-frame):  
`ring_rendered`, `ring_layout`, `ring_animation_started`, `ring_animation_stopped`  
(`ring_animation_iteration` omitted — Reanimated UI-thread loop has no cheap JS tick without noise.)

---

## Files changed

- `src/components/brand/SplashLogoOrbit.tsx` — **new** orbit/ring
- `src/components/brand/KavyaCinematicSplash.tsx` — mount orbit, shared logo cluster
- `src/utils/startupDiagnostics.ts` — ring phase names
- `STARTUP_SPLASH_FIX_REPORT.md` — this update

**Not changed:** auth, providers, navigation, APIs, business logic, native splash assets (native remains static).

---

## Verification

### TypeScript

```text
npx tsc --noEmit
→ pass (no errors)
```

### Expo Doctor

```text
npx expo-doctor
→ 17/18 passed
→ 1 failed (pre-existing): app config fields vs checked-in android/ios (Prebuild / CNG)
→ unrelated to splash orbit
```

### Physical Android device

| Scenario | Result |
|----------|--------|
| Cold start | **Requires force-stop + reopen** on device (not claimed fixed from Fast Refresh alone) |
| Logged-out / logged-in | Same splash path — orbit should show either way |
| Offline start | Same (no API gate on orbit) |
| Dev build | Validate after Metro reload / cold start |
| QA/release APK | **Not tested in this change** — do not claim release-fixed until a new APK is built and cold-started |

---

## Expected visual result

```text
Blue native splash (static)
→ cinematic logo centered
→ clearly visible smooth circular orbit (dashed ring + gold accent)
→ title / subtitle reveal
→ smooth fade to login/home
```

Single `KavyaCinematicSplash` mount, one guarded `SplashScreen.hideAsync()`, no ActivityIndicator / progress bar / duplicate logo screen.
