# Follow-up workflow decision

**Date:** 11 July 2026  
**Decision: Option B — Strip / hide incomplete follow-ups**  
**Target for full follow-ups: Version 1.1**

---

## Why not Option A (ship now)

Backend already has optional fields on `Visit`:

- `follow_up_required`
- `next_visit_date` (API alias `follow_up_date`)

However, the **active product path is incomplete**:

1. Mobile submit hardcodes `follow_up_required: false` in `visitSubmitApi.ts`.
2. Four-step visit UI never captures a follow-up date.
3. Mobile dashboard metrics intentionally omit follow-ups (`dashboard_metrics.py`; tests in `test_visit_workflow_simplified.py`).
4. `FollowUpCarousel` is not mounted on the Today tab.
5. Farmer list serializers do not expose follow-up due dates used by `workQueue.ts`.
6. There is **no** first-class `FollowUp` model, assignment, completion, cancel, or notification type.

Shipping end-to-end correctly would require coordinated mobile UI, dashboard API, farmer serializers, admin list, and QA — beyond Phase 1’s “smallest reliable” bar without risking misleading UI.

---

## What Phase 1 does

### Mobile

- Stop sending a silent always-`false` that implies a working control: keep payload compatible but **remove / hide** follow-up cards and sections that imply a live workflow.
- Hide Today follow-up progress reliance where it misleads; prefer visit/coverage KPIs from the server.
- Leave DB fields and API write path intact for v1.1.

### Admin

- Visit detail may still **display** `follow_up_required` / `follow_up_date` when present on historical records (read-only truth).
- No dedicated follow-up management screen in Phase 1.

### Backend

- No schema removal.
- Optional follow-up fields remain accepted for compatibility.

---

## Version 1.1 scope (when shipping)

```text
Visit marks follow-up required + date
→ backend persists
→ mobile due list + notifications
→ admin overdue list
→ completing a new visit clears/links the due item
```

---

## Data safety

Existing visits with `follow_up_required=true` or `next_visit_date` set are **not** deleted or migrated away.
