# Kavya Agri Clinic — Implementation Plan

**Based on:** `KAVYA_AGRI_CLINIC_COMPLETE_AUDIT.md` (11 July 2026)  
**Rule:** Do not start large refactors. Prefer fixing contracts, wiring existing backend APIs, and closing security/data gaps.  
**Repos:** Mobile `d:\agri-clinic-mobile` · Backend `d:\agri_clinic` · Prefer single admin target (recommend `agri-admin-new` scaffold + correct APIs, or evolve `agri-admin` — pick one before coding).

---

## How to use this backlog

1. Complete **P0** in order before external client testing.  
2. Treat each row as a shippable task with its own test.  
3. Avoid parallel rewrites of mobile navigation or backend domain models unless a P0 task requires it.

---

## Backlog

| Priority | Module | Task | Files affected | Backend change | Mobile change | Admin change | Test required | Risk |
|----------|--------|------|----------------|----------------|---------------|--------------|---------------|------|
| P0 | Security | Put production API behind HTTPS; update mobile default/env; disable cleartext in release builds | `agri_clinic` deploy/nginx or ALB; `src/api/config.ts`; `app.config.js`; `.env.production`; `eas.json` | TLS cert + redirect | Base URL `https://…` | Env base URL HTTPS | MITM check; login on device | Medium (deploy) |
| P0 | Admin | Fix login to `POST /api/v1/auth/login/`; env-based API host; store refresh if needed | Chosen admin `LoginPage` / `auth.api.ts` / `axios.ts` | None | None | Yes | Admin login success/fail | Low |
| P0 | Admin | Add `ProtectedRoute` on all authenticated routes (Admin2) | `agri-admin-new/src/router/AppRoute.tsx` | None | None | Yes | Unauthed redirect | Low |
| P0 | Admin | Wire Dashboard to `/api/v1/dashboard/overview/` or `admin/dashboard/stats/` — remove hardcoded 2/1/0 | `Dashboard.tsx`, `dashboard.api.ts` | None (use existing) | None | Yes | Live counts match DB | Low |
| P0 | Admin | Wire Visits list/detail to `/api/v1/admin/visits/` (+ attachments) | `Visits.tsx`, new API module | None | None | Yes | List pagination; open visit | Medium |
| P0 | Admin | Wire Employees to `/api/v1/employees/` (list/create/toggle/reset-password) | `Employees` pages, `employees` API | None | None | Yes | Create field agent; toggle | Medium |
| P0 | Follow-ups | **Decision gate:** implement OR remove | Product doc + code | Maybe | Maybe | Maybe | N/A | — |
| P0 | Follow-ups | If implement: submit `follow_up_required` + `follow_up_date` from visit form; add UI on step 3/4 | `visitSubmitApi.ts`; `visitFormStore.ts`; `create-step3/4`; i18n | Accept (already) | Yes | Optional list | Create visit with follow-up; appears in DB | Medium |
| P0 | Follow-ups | If implement: dashboard/farmer serializers expose due follow-ups; mount carousel or Work section | `dashboard_metrics.py` or visit-derived endpoint; farmer serializers; `index.tsx`; `FollowUpCarousel.tsx`; `workQueue.ts` | Yes | Yes | Optional | Due/overdue lists accurate | Medium |
| P0 | Follow-ups | If remove: strip follow-up KPIs, carousel, work sections, notification type; keep optional API compat | Mobile today/work/notifications UI; docs | Optional comment | Yes | None | No follow-up UI remains | Low |
| P0 | Auth | Enforce `can_login` + `is_active_employee` on mobile login, refresh, and `auth/me` | `mobile_api/auth.py`; JWT auth hooks if needed | Yes | None (errors already handled) | None | Disabled user cannot sync | Medium |
| P0 | Auth | Stop storing plaintext password for biometrics; use refresh token or re-prompt password | `biometricLoginStorage.ts`; `AuthContext.tsx` | None | Yes | None | Biometric still works; SecureStore has no password | Medium |
| P0 | Visits | Online evidence reliability: retry attachment upload; surface failed evidence on visit detail; allow re-upload | `create-step4-review.tsx`; `visitSubmitApi.ts`; `visit/[id].tsx`; optional backend flag | Optional `evidence_incomplete` | Yes | Show flag | Kill network mid-photo | Medium |
| P0 | Farmers | Add DB-level phone uniqueness (handle blanks); keep merge command | `masters/models.py` + migration; `serializers.py` | Yes | Surface 400 clearly | None | Duplicate phone rejected | Medium |
| P1 | Security | Require device session (or deprecate) on legacy `/api/v1/visits/` and `/api/v1/farmers/` writes | `visits/views.py`; `farmers/views.py`; permissions | Yes | Verify mobile uses `/mobile/` only | None | Legacy clients break if any | High |
| P1 | Admin | Live GPS map: `tracking/admin/live/` + route-by-date | New map page; leaflet/mapbox | None | None | Yes | See employee live + day route | Medium |
| P1 | Admin | Day report view: `/api/admin/employees/{id}/day-report/` | Report page | None | None | Yes | Visits + GPS + offline meta | Low |
| P1 | Admin | Masters: remove Taluk; fix district payload `name`; drop restore calls | Admin1/Admin2 masters APIs/pages | None | None | Yes | CRUD district/village/crop | Low |
| P1 | Admin | Pick one admin repo; archive the other in README | Docs | None | None | Process | N/A | Low |
| P1 | Visits | Align validation: either send field-visit required fields from mobile or tighten legacy path to require observation/problem | `field_visit.py`; `visitSubmitApi.ts`; step validators | Yes | Yes | None | Invalid payload 400 | Medium |
| P1 | Roles | Define Supervisor: allow mobile **or** elevate backend **or** remove role from create UI | `employees.ts`; `accounts/models.py`; admin employee form | Maybe | Maybe | Yes | Supervisor journey documented | Medium |
| P1 | Auth | Apply DRF login throttle to login views | `accounts/views.py`; `mobile_api/auth.py`; `settings.py` | Yes | None | None | 11th attempt limited | Low |
| P1 | Farmers | Optional filter: employees see `assigned_employee=self` + unassigned (config flag) | `farmers/helpers.py`; mobile list | Yes | Yes | Assign UI | Territory-like scoping | Medium |
| P1 | Admin | Farmer admin CRUD + assign employee | Admin farmers page | None (API exists) | None | Yes | Assign + list | Medium |
| P1 | Audit | Log admin login, employee toggle, farmer merge, visit delete | `audit_logs` usage sites | Yes | None | Optional viewer | Audit row created | Low |
| P1 | Reports | Wire at least daily + employee-visits report screens | Admin Reports page | None | None | Yes | Non-empty tables | Low |
| P2 | Farmers | Mobile edit farmer name/phone/village | `farmer/[id].tsx`; `farmersApi` | None (PUT exists) | Yes | None | Edit persists | Low |
| P2 | Visits | Select FarmerField on visit; send `field` + land area | Visit steps; submit builder | None | Yes | None | Visit.field set | Medium |
| P2 | Visits | Visit assignment / daily plan (minimal): admin assigns date+farmer+employee; mobile Today list | New model or Visit pending status; mobile home | Yes | Yes | Yes | Assigned visit appears | High |
| P2 | GPS | Mock location detection on Android; reject or flag visit | Tracking services; visit submit | Store flag | Yes | Show flag | Mock GPS marked | Medium |
| P2 | GPS | Optional geofence vs farmer GPS | Visit validation | Yes | Yes | Config | Out-of-range blocked/warned | Medium |
| P2 | Notifications | Register Expo push token; backend send on visit assign / follow-up due | New endpoints; `expo-notifications` | Yes | Yes | Broadcast optional | Push received | High |
| P2 | Offline | Improve failed-queue UX; bump GPS cap; preserve start/end anchors | `offlineSyncManager.ts`; `trackingConfig.ts`; OfflineSync screen | None | Yes | Sync health widget | No silent drop | Medium |
| P2 | Code quality | Single HTTP client; quarantine legacy screens (`VisitForm`, old lists) | `src/api/*`; `mobile/lib/api.ts`; navigation | None | Yes | None | Regression smoke | Medium |
| P2 | Tests | Mobile unit tests for visit validation + sync dedupe; expand backend follow-up/admin contract tests | `__tests__` / pytest | Yes | Yes | None | CI green | Low |
| P3 | Products | Product master + recommend on visit | New models/APIs | Yes | Yes | Yes | Catalog CRUD | High |
| P3 | Comms | SMS/WhatsApp share advisory | Integrations | Yes | Yes | Yes | Message sent | High |
| P3 | Field ops | Group meeting / demo / campaign activity types | Models + UI | Yes | Yes | Yes | New activity type | High |
| P3 | Geo | Farm boundary polygons | Models + map | Yes | Yes | Yes | Draw polygon | High |

---

## Suggested sprint slices

### Sprint 0 — Security & honesty (3–5 days)

- HTTPS  
- Biometric password removal  
- `can_login` enforcement  
- Follow-up decision + either wire or strip UI  

### Sprint 1 — Admin usable (1–2 weeks)

- Login + guards  
- Dashboard, Visits, Employees  
- Remove taluk / fix masters payloads  
- Choose canonical admin repo  

### Sprint 2 — Field data integrity (1 week)

- Evidence retry  
- Phone unique constraint  
- Validation alignment  
- Login throttle + legacy API session policy  

### Sprint 3 — Supervision (1–2 weeks)

- Live map + day report  
- Farmer assign + optional directory scope  
- Basic reports  
- Supervisor role decision  

### Later — v1.1+

- Assignment plans, push, mock GPS, farmer edit, field binding, product catalog  

---

## Explicit non-goals (now)

- Rewriting the mobile app to Expo Router-only or removing `src/`  
- Reviving unmounted `crm/`  
- Building a third admin frontend  
- Full commerce / dealer network  
- Replacing JWT with Cognito without a separate project  

---

## Definition of done for “client testing”

- [ ] Admin can log in and see real visit + employee data  
- [ ] Mobile production build uses HTTPS  
- [ ] Follow-up behavior matches UI (present or absent)  
- [ ] Disabled employee cannot continue field sync  
- [ ] Visit photos either always attach or clearly retry  
- [ ] Duplicate farmer phones blocked  
- [ ] Manual QA checklist in audit §11 executed on APK + admin  

---

## Definition of done for “production”

All of the above, plus:

- [ ] Live GPS admin view  
- [ ] Legacy API session bypass closed or documented exception  
- [ ] Login rate limiting active  
- [ ] Backup/restore and S3 (or durable media) verified  
- [ ] Audit trail for admin critical actions  
- [ ] Supervisor behavior documented and implemented  

---

*Implementation must not begin until this plan and the complete audit are accepted. Prefer smallest diffs that reconnect existing backend capabilities.*
