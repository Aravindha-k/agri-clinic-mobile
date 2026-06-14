# Problem Catalog Audit — Root Cause & Fix

**Date:** 2026-06-11

## PART 1 — Data audit

### API endpoints (mobile)

| Request | Example |
|---------|---------|
| Categories | `GET /api/v1/masters/problem-categories/dropdown/` |
| Items (crop-scoped) | `GET /api/v1/masters/problem-items/?category=pest&crop_id=84&page_size=200` |
| Items (catalog-wide) | `GET /api/v1/masters/problem-items/?category=pest&page_size=200` |

Backend crop filter (`models_Q_crop_filter`):

```python
Q(crop_id__isnull=True) | Q(crop_id=crop_id)
```

### DB counts (local `agri_clinic` DB)

| Crop | crop_id | Pest (with crop filter) | Disease | Nutrient | Notes |
|------|---------|-------------------------|---------|----------|-------|
| **Amla** | 84 | **0** | 0 | 0 | No rows linked to Amla |
| **Banana** | 55 | **0** | 0 | 0 | No rows linked |
| **Groundnut** | 62 | **6** | 0 | 0 | Mobile should show 6 |
| **Paddy** | 52 | **10** | 0 | 0 | Mobile should show 10 |

| Metric | Count |
|--------|------:|
| Total active problem items | 141 |
| Generic items (`crop_id` null) | **0** |
| Items in `pest` category | 141 |
| Items in `disease` / `nutrient_deficiency` | 0 |

**Without `crop_id` param:** all 141 pest items returned for any crop.

### Root cause

1. **Not a mobile filter bug for Amla** — API correctly returns 0 when `crop_id=84` because **no problem masters are linked to Amla** in the database.
2. **Web admin** lists the full catalog (141 items) without crop filter → appears to have data for every crop.
3. **Disease / Nutrient chips** will always be empty until masters are imported under those categories (currently 100% `pest`).
4. **No generic (`crop_id=null`) items** — every item is tied to a specific crop; crops without rows get nothing unless user searches catalog-wide.

Re-run audit: `py -3 D:\agri_clinic\scripts\audit_problem_catalog.py`

---

## PART 2–4 — UX changes (mobile)

| Before | After |
|--------|-------|
| Searchable dropdown only | **Problem cards** (tap to select) |
| Empty → vague message | **Empty state** + **Search all problems** |
| Always `crop_id` filter | **Catalog-wide fallback** (omits `crop_id`) |
| Wrong cache crop logic risk | `problemItemMatchesCrop()` mirrors backend |

### New components

- `ProblemCard` — English, Tamil, category badge, large tap target
- `problemItemFilter.ts` — shared filter matching API semantics
- `fetchAllProblemItemsForQuery()` — paginated load for card grid

### Flow

```
Crop selected → Category chip → Common problem cards (up to 8)
  → "More problems" / "Search all problems" → full-screen search modal
```

---

## PART 5 — Verification matrix

| Crop | DB (pest+crop) | API without crop_id | Mobile (crop) | Mobile (search all) |
|------|----------------|---------------------|---------------|---------------------|
| Amla | 0 | 141 | Empty + CTA | 141 cards |
| Banana | 0 | 141 | Empty + CTA | 141 |
| Groundnut | 6 | 141 | 6 cards | 141 |
| Paddy | 10 | 141 | 10 cards | 141 |

---

## Backend / data gaps (action for admin)

1. **Link problem items to Amla, Banana, etc.** in Problem Master import (crop column).
2. **Add disease & nutrient** problem rows (currently 0 in DB).
3. **Optional:** generic problems (`crop_id` null) for cross-crop issues.
4. **Optional:** `GET problem-items/?crop_id=` include count in categories dropdown for mobile badges.

---

## Build

`npm run typecheck` — pass after changes.

## Screenshots

Capture on device:
- Amla + Pest → empty state with "Search all problems"
- After search all → card list / modal with 141 items
- Groundnut + Pest → 6 problem cards

Save to `docs/screenshots/problem-catalog/`.
