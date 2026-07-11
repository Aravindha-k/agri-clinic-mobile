# Home Logo Sunshine Glow — Experiment Report

**Date:** 11 July 2026  
**Commit:** `feat(mobile): add experimental sunshine glow behind home logo`  
**Scope:** Home (Today) logo presentation only

---

## Summary

Added an experimental **SunGlow** behind the existing Kavya logo on the Today header. The logo asset and `BrandLogoBadge` are unchanged; glow is an isolated backdrop with a one-line feature toggle for instant revert.

---

## Files changed

| File | Change |
|------|--------|
| `mobile/components/brand/SunGlow.tsx` | **New** — soft golden layered glow (Reanimated) |
| `mobile/components/brand/HomeLogoWithSunGlow.tsx` | **New** — wraps badge + glow; respects toggle |
| `mobile/components/brand/homeLogoExperiment.ts` | **New** — `HOME_LOGO_SUNSHINE_GLOW_ENABLED` |
| `mobile/components/brand/BrandHeader.tsx` | Optional `sunshineGlow` prop (default off) |
| `mobile/components/today/TodayHeader.tsx` | Enables `sunshineGlow` on Home only |
| `mobile/components/brand/index.ts` | Exports for the experiment |
| `HOME_LOGO_SUNSHINE_GLOW_REPORT.md` | This report |

**Not changed:** splash, login, navigation, APIs, GPS, tracking, Today layout structure, logo asset.

---

## How to revert

Set in `mobile/components/brand/homeLogoExperiment.ts`:

```ts
export const HOME_LOGO_SUNSHINE_GLOW_ENABLED = false;
```

Or remove `sunshineGlow` from `TodayHeader`. Previous `BrandLogoBadge` path is unchanged.

---

## Animation values

| Property | Values | Notes |
|----------|--------|-------|
| Opacity | 0.15 → 0.35 → 0.15 | Soft morning light |
| Scale | 0.90 → 1.10 → 0.90 | Slow expand / contract |
| Duration | **7000 ms** full cycle | Within 6–8 s target |
| Easing | `Easing.inOut(Easing.sin)` | No flash |
| Loop | Infinite | Single Reanimated loop |
| Rotation / orbit / bounce | **None** on the glow | |
| Logo motion | **Static** (badge `animated={false}` while glow on) | Optional 1.02 scale skipped |

Glow diameter ≈ `logoSize × 1.85`, centered behind the badge. Three layered warm discs simulate large soft blur without `BlurView`.

Colors: warm golds (`rgba(245,215,140,…)`, `rgba(250,224,160,…)`, `rgba(255,236,185,…)`) on the existing blue/glass Today header.

---

## Accessibility

| Mode | Behavior |
|------|----------|
| Normal | Opacity + scale loop |
| Reduced motion / battery saver / low-end | **Static** faint glow (~0.18 opacity, scale 1) — no scaling loop |

Uses existing `usePremiumMotion()`.

---

## Performance

- Reanimated shared values + `withRepeat` (UI thread) — no React re-renders per frame
- No `BlurView`, no SVG, no particles
- Three static `View` discs under one animated wrapper
- Expected cost: negligible vs orbit icons already on the hero logo

Physical outdoor / low-end device checks should still be eyeballed after a cold reload.

---

## Before vs after

| | Before | After (experiment on) |
|--|--------|------------------------|
| Logo | `BrandLogoBadge` (orbit + float when animated) | Same badge, **static** mark |
| Backdrop | Hero layers / logo glow SVG only | Soft **sunshine** disc breathing behind logo |
| Screens affected | — | **Today only** |

---

## Recommendation (updated)

**Revert / do not ship sunshine glow.** Prefer the classic orbit logo.

Home Today now uses `BrandLogoBadge` with orbit again (sunshine disabled via `HOME_LOGO_SUNSHINE_GLOW_ENABLED = false` and removed from `TodayHeader`).


---

## Verification

```text
npx tsc --noEmit     → pass (run with this change)
npx expo-doctor      → 17/18 (pre-existing Prebuild vs android/ios; unrelated)
```

Device matrix (small/large Android, outdoor readability): confirm visually after force-stop cold open — not claimed from Fast Refresh alone.
