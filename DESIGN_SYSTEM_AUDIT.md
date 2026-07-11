# Design System Audit — Kavya Agri Clinic Mobile

**Date:** 11 July 2026  
**Repo:** `d:\agri-clinic-mobile`  
**Mode:** Read-only

---

## 1. Executive finding

The app has a **usable V2 token foundation** in `mobile/lib/theme.ts` and a growing `mobile/components/ui` kit. Active tab flows mostly adopt it. Consistency is held back by **five overlapping token layers**, **duplicate primitives** across `mobile/` and `src/`, and **ad-hoc forms** that ignore the unused `EnterpriseTextField`.

**Design-system maturity: 5 / 10**

---

## 2. Token sources (too many)

| File | Role | Conflict |
|------|------|----------|
| `mobile/lib/theme.ts` | **Should be canonical** — Colors, Spacing, Radius, Shadow, Layout | — |
| `mobile/lib/designSystem.ts` | Premium/harvest typography & shadows | Parallel radius/shadow |
| `mobile/lib/fieldTheme.ts` | Nature/hero glass surfaces | Third visual dialect |
| `src/theme/lightTheme.ts` + `ThemeContext` | Context theme + dark mode | Different primary green `#0F5132` vs brand `#0F6B43` |
| `src/theme/radius.ts` / `spacing.ts` / `typography.ts` | Legacy scales | Card radius **18** vs mobile **24** |
| `src/theme/stitchTokens.ts` | Stitch reference | Card **16**, button **12** |
| `src/config/brand.ts` | Brand colors | Feeds mobile theme (good) |

### Critical token conflicts

| Token | mobile/theme | src/radius | stitch |
|-------|--------------|------------|--------|
| Card radius | 24 | 18 | 16 |
| Button radius | 16 | 14 | 12 |
| Body text | 16 | 15 / 14 | — |
| Touch min | 48 | 46 / 40 (sm) | — |

**Primary greens in play:** `#0F6B43` (brand), `#0F5132` (lightTheme), `#0B3D28` (harvest forest).

---

## 3. Existing reusable components

### Active kit — `mobile/components/ui/`

| Component | Purpose | Notes |
|-----------|---------|-------|
| `PrimaryButton` | 52px brand CTA | Good a11y role; loading spinner |
| `GhostButton` | Secondary | Shorter than primary |
| `EnterpriseTextField` | Labeled input | **Exported but unused in screens** |
| `SearchBar` | Search + clear | Used in visit/work |
| `StatusChip` | Semantic badges | Good |
| `EmptyState` | Empty + optional CTA | Good |
| `Avatar` | Initials | Good |
| `OfflineBanner` | Sync/offline strip | Good |
| `PressableCard` | Animated press wrapper | Good |
| `ActionTile` | Dashboard tiles | Good |
| `Skeleton` / `ListSkeleton` / `ListStateView` | Loading/empty lists | Good |
| `FilterChipRow` | Filters | Overlaps other chip UIs |
| `SectionTitle` / `SectionHeader` | Headings | Good |
| Decorative nature/glass components | Visual polish | Heavy; outdoor contrast risk |

### Layout — `mobile/components/layout/`

| Component | Purpose |
|-----------|---------|
| `StackScreenHeader` | Back + title |
| `CompactScreenHeader` / `ScreenPageHeader` | Tab headers |
| `FlatCard` | Card shell |
| `ScreenCanvas` | Background |
| `ScreenLoader` / `InlineSeedLoader` | Loaders |
| `GlobalStatusStrip` | Top sync/offline |

### Legacy kit — `src/components/ui/` + App*

| Component | Issue |
|-----------|-------|
| `PrimaryButton`, `StatusChip`, `EmptyState`, `SearchBar` | **Duplicates** of mobile kit |
| `BottomNav` | **Unused** (replaced by `MainTabBar`) |
| `AppButton`, `AppInput`, `AppCard` | Older API |
| `KpiCard`, `FarmerCard`, `VisitCard` | Legacy list patterns |
| `ToastHost` | Still active globally |
| `VisitFabTabButton` | Active FAB |

### Sheets / dialogs

| Pattern | Example | Issue |
|---------|---------|-------|
| Full-screen Modal | `MasterSelectSheet` | No shared sheet primitive |
| `@gorhom/bottom-sheet` | `WorkdayRequiredSheet` | Different API |
| `Alert.alert` | Permissions, confirm | System dialogs only |

---

## 4. Missing shared components (recommended)

| Missing | Why |
|---------|-----|
| Single **Button** API (primary/secondary/danger/ghost) | 4 implementations today |
| **EnterpriseTextArea** + adopt `EnterpriseTextField` | Forms use raw `TextInput` |
| **FormField** (label, error, required, helper) | Per-screen validation UI |
| **ConfirmDialog** | Only native Alert |
| **Sheet** primitive | Modal vs bottom-sheet inconsistency |
| **Badge** | Notification counts inlined |
| One **Card** | FlatCard vs AppCard vs PremiumCard vs listCard |
| One **FilterChip** | FilterChipRow / FilterPillRow / FilterChips / inline |
| One **Loader** family | KavyaLoader, BrandedLoader, ScreenLoader, skeletons |
| **ScreenScaffold** | Safe area + canvas + header + scroll padding |

---

## 5. Visual consistency score: **5 / 10**

| Strength | Weakness |
|----------|----------|
| Active tabs use `mobile/lib/theme` | 5+ token files |
| PrimaryButton 52px meets outdoor needs | Duplicate buttons/chips/empty states |
| FlatCard + ScreenCanvas emerging | 80+ hardcoded `borderRadius` literals |
| Offline Sync screen is V2-clean | Dark mode ThemeProvider bypassed by static `Colors` |
| i18n EN/TA present | Headers: 5+ distinct patterns |

### Observed variance

- Border radii: 4–30 and 999/9999 outside tokens  
- Shadows: `Shadow`, `PremiumShadow`, `createShadows()`, inline  
- Back buttons: CompactScreenHeader ~32×36 (below 48dp) vs StackScreenHeader better  
- Login CTA is a one-off gradient, not `PrimaryButton`  
- Visit step 3 notes use card radius 24 vs input radius 16  

---

## 6. Screen sampling (design-system lens)

| Screen | Token adherence | Form pattern | Outdoor contrast |
|--------|-----------------|--------------|------------------|
| Login | Good theme imports | Custom inputs, tiny eye hit area | High (dark text on white) |
| Today | Good | N/A | Glass headers may wash out in sun |
| Work | High | Search/filters OK | Good |
| Visit 1–4 | Good tokens | Raw TextInputs; MasterSelectSheet | Good primary CTAs |
| Day | Good | N/A | Dark hero = excellent; cards good |
| Profile | Mixed DS + local overrides | Menu rows OK | Good |
| Offline Sync | Best-in-class V2 | PrimaryButton | Excellent |

---

## 7. Architecture observations

1. **Dual tree:** `mobile/` (active) vs `src/` (legacy screens still in repo).  
2. **Large screens:** Profile ~716 lines; visit step1/2 ~670; Login ~475.  
3. **ThemeProvider dark mode** exists but active UI imports static `Colors` — dark mode will not apply.  
4. **Dead screens** still inflate maintenance cost.  
5. **EnterpriseTextField unused** — biggest quick win for form consistency.

---

## 8. Consolidation priorities (no code yet)

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Declare `mobile/lib/theme.ts` sole token source; document fieldTheme as “premium layer only” | S |
| P0 | Adopt PrimaryButton + GhostButton everywhere; shim/deprecate src duplicates | M |
| P1 | Wire EnterpriseTextField + TextArea into Login + visit steps | M |
| P1 | Unify FlatCard; retire AppCard/PremiumCard on active paths | M |
| P1 | Fix back/icon hit areas to ≥48dp | S |
| P2 | ScreenScaffold; ConfirmDialog; Sheet primitive | M |
| P2 | Archive unwired `src/screens/*` | S |
| P3 | Real dark-mode via tokens (or remove ThemeProvider claim) | L |

---

## 9. Recommendation

**Do not redesign the visual brand.** Consolidate tokens and primitives so the existing green field aesthetic becomes consistent. The active product already looks intentional; the system underneath is fragmented.

*End of design system audit.*
