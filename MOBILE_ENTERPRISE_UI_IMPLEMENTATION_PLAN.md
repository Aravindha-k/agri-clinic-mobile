# Mobile Enterprise UI — Implementation Plan

**Date:** 11 July 2026  
**Repo:** `d:\agri-clinic-mobile`  
**Baseline maturity:** 68 / 100  
**Target:** 90+ / 100 (presentation quality; workflows unchanged)  
**Constraint:** No changes to navigation structure, APIs, auth/visit/GPS/offline business logic.

---

## Principles

1. Preserve every workflow end-to-end.  
2. Consolidate on `mobile/lib/theme.ts` as the single source of truth.  
3. Prefer extending existing components over inventing parallel kits.  
4. Touch targets ≥ 48dp; sunlight-safe headers on critical surfaces.  
5. One commit family at a time; `npx tsc --noEmit` must pass before the next.

---

## Commit plan

| Commit | Scope | Screens / files | Effort | Risk |
|--------|-------|-----------------|--------|------|
| 1 | Design system tokens | `mobile/lib/theme.ts`, typography helpers | S | Low |
| 2 | Shared components | Buttons, fields, badge, empty, chips | M | Low |
| 3 | Home (Today) | Today header, hero CTA fold, contrast | M | Low |
| 4 | Farmer module | Queue cards, farmer detail grouping | M | Low |
| 5 | Visit module | Step headers, field spacing, edit hits, sticky CTA | M | Medium |
| 6 | Day + GPS | End workday confirm, map alias honesty | M | Medium |
| 7 | Profile / Settings / Notifications / Offline | Layout polish | M | Low |
| 8 | A11y + polish | Global hit targets, release notes | S | Low |

---

## Screen-by-screen improvements

| Screen | Before | After (visual only) | Components | Risk |
|--------|--------|---------------------|------------|------|
| Splash | Blank auth hydrate | Keep cinematic; no workflow change | — | Low |
| Login | Small eye toggle; one-off gradient CTA | 48dp suffix control; PrimaryButton CTA; EnterpriseTextField | Field, Button | Low |
| Today | Glass header; CTA may sit below fold | Solid/high-contrast header; prominent workday action | Header, Button | Low |
| Work queue | Dense cards | Token spacing; clearer primary Visit affordance | Cards, Chips | Low |
| Farmer detail | Long scroll | Grouped sections; larger actions | FlatCard, Button | Low |
| Visit 1–4 | Raw inputs; small Edit | Shared fields; sticky CTA; 48dp Edit | Field, Button, StepIndicator | Medium |
| Visit success | OK | Keep; minor typography | — | Low |
| Day | End workday unclear | Confirm sheet + sticky End control | Sheet, Button | Medium |
| My Location | Alias confusion | Product copy clarifies single map surface | — | Low |
| Offline Sync | Already strong | Minor token alignment | — | Low |
| Profile | Monolith | Section hierarchy + larger menu rows | FlatCard | Low |
| Settings | Theme mismatch claim | Keep language; clarify appearance copy if needed | — | Low |
| Notifications | OK | Empty/skeleton consistency | EmptyState | Low |

---

## Design-system changes

### Typography (`TextStyles`)

Display, H1–H4, BodyLarge, Body, Small, Caption, Label, Button — built from existing FontSize/FontWeight.

### Spacing / Radius / Shadow

Keep `Spacing` 4–64 scale. Alias Radius: `small/md/large/xl/full`. Extend Shadow with `sheet`, `dialog`, `fab` (map to existing elevations).

### Semantic colors

Add aliases: `primary`, `secondary`, `success`, `warning`, `error`, `info`, `disabled`, `textPrimary`, etc. — pointing at existing `Colors` values (no random new hex).

### Icons

`IconSize` tokens: 16 / 20 / 24 / 28; `Layout.touchTargetMin` remains 48.

### Components to ship / extend

| Component | Action |
|-----------|--------|
| `PrimaryButton` | Add `variant`: primary / secondary / outline / destructive; loading/disabled |
| `GhostButton` | Align height to 48+; disabled |
| `EnterpriseTextField` | helperText, required, accessibilityLabel |
| `EnterpriseTextArea` | New multiline variant |
| `StatusChip` | Ensure semantic variants cover sync/GPS |
| `EnterpriseBadge` | New compact badge |
| `EmptyState` | Already good — ensure token-only |
| Hit-area helpers | `minTouchStyle` utility |

**Out of scope for this pass (future):** full ConfirmDialog rewrite, gorhom Sheet unification, dark-mode token wiring, archiving all dead `src/screens`.

---

## Estimated effort

| Phase | Days |
|-------|------|
| DS + shared components | 1 |
| Today + Farmer + Visit polish | 1.5 |
| Day/GPS + Profile + a11y | 1 |
| QA / screenshots / notes | 0.5 |

---

## Screenshots to capture after implementation

1. Login (EN) — CTA + validation  
2. Today — workday hero above fold  
3. Work queue — farmer card  
4. Visit step 2 — chips + sticky continue  
5. Visit step 4 — review Edit chips  
6. Day — End workday confirm  
7. Offline Sync — pending queue  
8. Profile — menu rows  
9. Notifications — empty state  

---

## Success criteria

- Workflows unchanged (login, farmers, visit, GPS, offline, sync).  
- `npx tsc --noEmit` green after each commit.  
- Touch targets ≥ 48dp on P0 controls.  
- No new random hex/spacing on touched files.  
- Perceived maturity toward **90+** via consistency + clarity (not feature count).

---

*Plan approved for implementation in the ordered commits below.*
