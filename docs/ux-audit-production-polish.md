# Agri Clinic Mobile — UX Audit & Production Polish

**Date:** 2026-06-11  
**Scope:** Audit + Phase 1–8 implementation (visit flow, design system, dashboard, offline UX)

---

## 1. UX Audit Report (12 screens)

| # | Screen | Spacing | Alignment | Typography | Cards | States | Production gap (before) | Status |
|---|--------|---------|-----------|------------|-------|--------|-------------------------|--------|
| 1 | Login | Medium | OK | Mixed weights | Stitch baseline | Error OK | Acceptable | Minor polish only |
| 2 | Dashboard (Home) | Crowded | Hero + KPI compete | 4+ title styles | Mixed Clinic/Premium | Skeleton OK | Hierarchy weak; tracking mid-page | **Fixed** — Workday → KPIs → Quick → Recent → Tracking |
| 3 | Farmer Directory | OK | Toolbar stack | Count line small | FarmerCard OK | Skeleton/empty OK | Quick filters page-limited | Partial (API gap) |
| 4 | Farmer Detail | Medium | Section drift | Dense labels | PremiumCard | Loading OK | Revisit went through farmer step | **Fixed** — fast revisit |
| 5 | Visit Creation (Details) | Poor | Single giant card | Form-like | One bloated card | GPS inline | Problem category/item buried; no sections | **Fixed** — section cards + sticky submit |
| 6 | Visits List | OK | Stitch bar | OK | VisitCard | Pagination client | Search page-limited | Known API gap |
| 7 | Visit Detail | OK | Timeline OK | OK | Observation flat | Skeleton OK | No structured problem display | **Fixed** — category + item rows |
| 8 | Tracking (Live Map) | OK | Map-first | OK | N/A | Loading | Buried in quick actions | **Fixed** — dashboard card |
| 9 | Route History | OK | List | OK | OK | Empty OK | Low discoverability | Tracking card links map |
| 10 | Offline Sync | OK | Queue list | OK | OK | Count OK | Not always visible | **Fixed** — Home status strip + banners |
| 11 | Profile | OK | Stitch | OK | OK | OK | — | Acceptable |
| 12 | Notifications | OK | List | OK | OK | Empty OK | — | Acceptable |

### Cross-cutting issues (before)

- Inconsistent spacing (10 / 14 / 16 / 20 mixed without scale)
- Visit form = development-style single scroll form
- Problem master data not visible in summary or detail
- No date picker (manual `YYYY-MM-DD`)
- Dashboard visual priority inverted (tracking before KPIs)

---

## 2. API verification (Phase 1)

| Endpoint | Status | Mobile client |
|----------|--------|---------------|
| `GET masters/problem-categories/dropdown/` | ✅ Exists | `getProblemCategories()` |
| `GET masters/problem-items/?category=&crop_id=&search=` | ✅ Exists | `fetchProblemItemsPage()` |
| `GET masters/crops/` | ✅ Exists | `getCrops()` / master cache |

### Fields received

| Field | Categories API | Problem items API |
|-------|----------------|-------------------|
| id | ✅ | ✅ |
| name | ✅ | ✅ (English) |
| code | ✅ | ✅ (as `category`) |
| tamil_name | ❌ not on category | ✅ on items |
| crop_name | — | ✅ |

### Visit flow (after)

```
Crop (searchable)
  ↓
Problem Category (Pest / Disease / Nutrient / Other chips)
  ↓
Problem Item (searchable modal — English + Tamil + category)
  ↓
Optional description
  ↓
Recommendation (observation, action, date picker)
  ↓
Evidence
  ↓
Sticky Review & submit
```

---

## 3. Design system (Phase 3)

### Spacing (`src/theme/spacing.ts`)

`4 · 8 · 12 · 16 · 24 · 32`

### Typography (`src/theme/designSystem.ts`)

| Token | Use |
|-------|-----|
| `pageTitle` | Screen titles |
| `sectionTitle` | Section headers |
| `body` / `bodyStrong` | Content |
| `caption` / `label` | Meta, field labels |

### Buttons (`PrimaryButton`)

`primary` · `secondary` · `outline` · `ghost` · **`danger`** (new)

### New UI primitives

| Component | Path |
|-----------|------|
| `VisitSectionCard` | `src/components/ui/VisitSectionCard.tsx` |
| `StickyFooter` | `src/components/ui/StickyFooter.tsx` |
| `DatePickerField` | `src/components/ui/DatePickerField.tsx` |
| `SelectedProblemItemCard` | `src/components/visit/SelectedProblemItemCard.tsx` |
| `SearchableSelectModal` | (existing) |

---

## 4. Screens changed

- `NewVisitDetailsScreen.tsx` — full section layout, sticky footer, date picker
- `VisitSummaryScreen.tsx` — problem category + item rows
- `VisitObservationCard.tsx` — structured problem display
- `ProblemCatalogSection.tsx` — crop gate, selected item card, loading
- `HomeScreen.tsx` — dashboard hierarchy reorder
- `VisitFlowContext.tsx` — meta fields for problem display
- `visits.ts` — `field_visit` types
- `spacing.ts`, `PrimaryButton.tsx`, `app.config.js` (date picker plugin)

---

## 5. Components created (this pass)

1. `VisitSectionCard`
2. `SelectedProblemItemCard`
3. `DatePickerField`
4. `StickyFooter`

---

## 6. Backend gaps

1. **Problem category Tamil name** — dropdown returns `id, code, name` only; no `name_ta`.
2. **Visit detail `problem_master` block** — `build_field_visit_problem_block` returns `id, name` only; no `tamil_name` on read API (mobile shows Tamil from catalog at submit time; historical visits may lack Tamil).
3. **Farmer list filters** — no `has_visits` / `assigned_to_me` server params (client-side quick filters on loaded pages).
4. **Village filter** — `village` query uses name `icontains`, not `village_id`.
5. **Full field-visit validation** — mobile uses legacy submit path; structured `problem_*` fields are optional enrichments.

---

## 7. Before / after screenshots

Screenshots were not captured in this session (Expo Go connection / device not available in CI).

**Manual capture checklist:**

1. Visit Details — before: single card with free-text problem; after: Farmer / Crop / Problem / Recommendation / Evidence sections
2. Visit Summary — before: one “Problem Seen” line; after: Category + Item (English · Tamil)
3. Visit Detail timeline — before: flat problem_seen; after: category + item rows
4. Home — before: tracking above KPIs; after: Workday → KPIs → Quick → Recent → Tracking

Run on device after `npm run start:phone`, save to `docs/screenshots/after/`.

---

## 8. Build status

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass |
| `@react-native-community/datetimepicker` | ✅ Installed + plugin in `app.config.js` |
| Offline visit queue | ✅ Unchanged |
| APIs | ✅ No breaking changes |

---

## 9. Test steps

1. **Visit flow:** Crop → Pest → search problem → confirm selected card shows English + Tamil + category → observation → date picker → evidence → review shows category/item → submit.
2. **Offline:** Airplane mode after master sync → problem search uses cache.
3. **Dashboard:** Confirm order: status strip → hero → workday → KPIs → quick actions → recent → tracking.
4. **Farmer directory:** Village filter, search, Call, Revisit (skips farmer step).
5. **Visit detail:** Open submitted visit; verify problem category/item if API returned `field_visit`.

---

## 10. Recommended next round

- Add `name_ta` to problem category dropdown (backend)
- Add `tamil_name` to visit `problem_master` read block (backend)
- Server-side `visited` / `village_id` farmer filters
- Capture automated screenshots via `scripts/capture-screenshots.ps1`
- Apply `VisitSectionCard` pattern to `NewVisitFarmerScreen` and Profile sub-forms
