# Mobile Enterprise UI — Release Notes

**Date:** 11 July 2026  
**Baseline maturity:** 68 / 100  
**Target maturity:** ~90 / 100 (presentation quality)  
**Scope:** Visual consistency, design system, accessibility polish — **no workflow, API, offline, GPS, or auth logic changes.**

---

## Design system improvements

Unified tokens in `mobile/lib/theme.ts`:

- **Typography:** `TextStyles` — display, h1–h4, bodyLarge, body, small, caption, label, button
- **Spacing:** existing 4–64 scale retained and documented via `Enterprise.spacing`
- **Radius:** aliases `small` / `medium` / `large` / `xl` / `full`
- **Elevation:** `Elevation` + `Shadow.sheet` / `dialog` / `fab`
- **Semantic colors:** `Semantic.primary`, surface, success/warning/error/info, text roles, disabled
- **Icons:** `IconSize` (sm/md/lg/xl)
- **Touch:** `minTouchStyle` + `Layout.touchTargetMin` (48dp)

---

## New / extended reusable components

| Component | Change |
|-----------|--------|
| `PrimaryButton` | Variants: primary, secondary, outline, ghost, destructive + loading/disabled |
| `GhostButton` | 48dp+ height, danger variant, loading/disabled |
| `EnterpriseTextField` | Helper, required, error, right-icon 48dp control |
| `EnterpriseTextArea` | Multiline field variant |
| `EnterpriseBadge` | Compact status badge |
| `StatusChip` | Hairline border for sunlight definition |
| `EmptyState` | Token typography (`TextStyles`) |
| `VisitFlowHeader` / `CompactScreenHeader` | ≥48dp back/close controls, solid surfaces |

---

## Screens upgraded

| Screen | Improvements |
|--------|----------------|
| **Login** | EnterpriseTextField + PrimaryButton; 48dp password toggle |
| **Today** | Solid bell control; End workday confirm when active |
| **Work / Farmers** | StatusChip priority; 48dp Call/Map/Visit actions |
| **Visit step 2** | Shared `VisitFlowHeader` (flow consistency) |
| **Visit step 4** | 48dp Change chips; human-readable problem chip |
| **Day** | End workday with confirm dialog (wires existing `endDay`) |
| **My Location** | Route-aware subtitle (Live / Travel aliases); 48dp refresh |
| **Profile** | H1 title scale; language pills ≥48dp tall |

---

## Accessibility improvements

- Minimum **48dp** touch targets on shared headers, login suffix, farmer actions, visit edit chips, map refresh, notification bell, language pills
- Higher-contrast solid header/control surfaces for outdoor readability
- Destructive End workday requires explicit confirmation

---

## Performance

- No new heavy animations or list virtualization changes
- Token/style consolidation reduces one-off style objects on shared headers and login

---

## Workflows preserved (unchanged)

- Authentication / biometrics unlock
- Farmer directory & visit creation (4-step)
- GPS / workday start
- Offline sync & pending queues
- Navigation structure & API contracts

---

## Remaining future enhancements

1. Full ConfirmDialog / bottom-sheet replace for native `Alert.alert`
2. Dark-mode semantic token wiring
3. Migrate legacy `src/screens` EmptyState / StatusChip callers to mobile kit
4. Skeleton loaders on every list remaining spinner
5. Deprecate unused Live Map / Travel History stack aliases once product confirms single map entry
6. Capture screenshot pack listed in `MOBILE_ENTERPRISE_UI_IMPLEMENTATION_PLAN.md`

---

## Verification

```bash
npx tsc --noEmit
```

Passed after implementation.
