# Kavya Agri Clinic — Phase 1 Implementation Report

**Date:** 11 July 2026  
**Scope:** Production-readiness slice 1 (admin usability, transport/auth hardening, follow-up decision, photo retry)

---

## Selected admin

| Item | Value |
|------|-------|
| **Canonical** | `d:\Agri_frontend_claude\agri-admin-new` |
| **Deprecated** | `d:\agri_clinic_frontend\agri-admin` (`DEPRECATED.md` added) |
| **Why** | Broader nav already covered Dashboard / Employees / Visits / Reports; Phase 1 needed monitoring screens more than masters-only polish |
| **Doc** | `agri-admin-new/ADMIN_FRONTEND_SELECTION.md` |

---

## Files changed (by area)

### Admin (`agri-admin-new`)

| File | Change |
|------|--------|
| `ADMIN_FRONTEND_SELECTION.md` | Selection rationale |
| `HTTPS_DEPLOYMENT_REQUIREMENTS.md` | TLS prerequisites |
| `FOLLOW_UP_DECISION.md` | Option B copy |
| `.env.example` / `.env.production.example` | Env templates |
| `src/utils/auth.ts` | Access + refresh + user session helpers |
| `src/api/axios.ts` | Base URL, refresh interceptor, unwrap helpers, HTTPS policy |
| `src/api/auth.api.ts` | Correct `/api/v1/auth/login/` + logout |
| `src/api/dashboard.api.ts` | Live dashboard service |
| `src/api/visits.api.ts` | Admin visit list/detail |
| `src/api/tracking.api.ts` | Live + route-by-date |
| `src/api/employees.api.ts` | Correct `/api/v1/employees/` paths |
| `src/api/masters.api.ts` | Districts only (taluk removed) |
| `src/router/ProtectedRoute.tsx` | Auth gate |
| `src/router/AppRoute.tsx` | Protected routes + visit detail + tracking |
| `src/layout/Sidebar.tsx` | Nav + logout |
| `src/pages/LoginPage.tsx` | Real login flow |
| `src/pages/Dashboard.tsx` | Backend KPIs (no hardcoded stats) |
| `src/pages/Visits.tsx` | List + detail (read-only) |
| `src/pages/Tracking.tsx` | Live agents + meaningful route markers |
| `src/pages/Employees.tsx` | Typed employees UI |
| `src/pages/Masters.tsx` | Districts only |
| `src/pages/Reports.tsx` | Explicit unavailable (not mocked) |

### Deprecated admin

| File | Change |
|------|--------|
| `agri-admin/DEPRECATED.md` | Do-not-use notice |

### Backend (`agri_clinic`)

| File | Change |
|------|--------|
| `mobile_api/auth.py` | Enforce `can_login`; refresh blocks disabled accounts |
| `mobile_api/device_session.py` | Active account check on mobile APIs |
| `accounts/views.py` | Username login enforces `can_login` |
| `visits/views.py` | Device session on legacy visit list/create |
| `farmers/views.py` | Device session on legacy farmer list/create |
| `docs/DEVICE_SESSION_POLICY.md` | Enforcement inventory |
| `mobile_api/tests/test_can_login_and_device_session.py` | New tests |

### Mobile (`agri-clinic-mobile`)

| File | Change |
|------|--------|
| `FOLLOW_UP_DECISION.md` | Option B — strip/hide |
| `HTTPS_DEPLOYMENT_REQUIREMENTS.md` | TLS prerequisites |
| `.env.production` | HTTPS placeholder (no cleartext production URL) |
| `src/api/config.ts` | HTTPS required in release |
| `app.config.js` | HTTPS default; cleartext only outside production profiles |
| `src/storage/biometricLoginStorage.ts` | No password storage; refresh unlock |
| `src/screens/LoginScreen.tsx` | Biometric unlock via refresh |
| `src/storage/AuthContext.tsx` | Enable biometric without password |
| `src/api/tokenRefresh.ts` | Handle 403 account disabled |
| `mobile/lib/homeApi.ts` | Follow-up KPIs forced empty |
| `mobile/components/today/TodayPlanRow.tsx` | No follow-up pending in ring |
| `mobile/lib/workQueue.ts` | Hide follow-up section |
| `mobile/lib/visitSubmitApi.ts` | Stop sending silent `follow_up_required: false` |
| `mobile/lib/sync/pendingEvidenceQueue.ts` | Failed photo retry queue |
| `mobile/lib/sync/offlineSyncManager.ts` | Flush evidence on sync |
| `mobile/app/visit/create-step4-review.tsx` | Enqueue failed evidence |

---

## Confirmed root causes → fixes

| Issue | Root cause | Fix |
|-------|------------|-----|
| Admin login failure | Called `/api/auth/login/` | Now `/api/v1/auth/login/` with typed tokens |
| Hardcoded dashboard | Static 2/1/0 in `Dashboard.tsx` | `/api/v1/dashboard/summary/` (+ trends/performance) |
| Missing visits/GPS admin | Placeholder pages | Wired admin visits + tracking APIs |
| Follow-up failure | Always-false submit + unwired UI | **Option B** strip/hide; v1.1 later |
| Cleartext HTTP | Hardcoded `http://13.207.17.117` | HTTPS required in release; docs for TLS |
| Plaintext biometric password | SecureStore `PASS_KEY` | Flag + refresh-token unlock; legacy keys cleared |
| `can_login` gap | Mobile ignored flag | Login, refresh, mobile mixin, web username path |
| Legacy device-session bypass | `/api/v1/visits|farmers` JWT-only | Mixin + policy doc + tests |
| Visit photo reliability | Visit saved, photos lost online | Pending evidence queue + sync flush |

---

## Before / after (behavior)

| Area | Before | After |
|------|--------|-------|
| Admin login | Failed (wrong path) | Works against Django `/api/v1/auth/login/` |
| Admin session | Access token only, no refresh, no guards | Access+refresh, protected routes, logout |
| Dashboard | Fake numbers | Live farmers/visits/employees + trends |
| Visits | Empty shell | Paginated list + read-only detail |
| GPS | Missing | Live duty table + start/visit/end markers |
| Follow-ups | Misleading empty/false UI | Hidden; decision documented |
| Biometrics | Stored password | Unlocks refresh session only |
| Disabled user | Could refresh/operate on mobile | Blocked at login/refresh/API |
| Production HTTP | Silent cleartext | Release fails without HTTPS env (unless emergency override) |
| Failed photos | Warning only | Queued and retried on sync |

---

## Test results

| Check | Command | Result |
|-------|---------|--------|
| Backend check | `d:\agri_clinic\.venv\Scripts\python.exe manage.py check` | **Pass** — 0 issues |
| Backend tests | `… manage.py test mobile_api.tests.test_can_login_and_device_session tracking.tests.test_device_session` | **Pass** — 12 tests OK |
| Admin TypeScript + build | `npm run build` (`tsc -b && vite build`) | **Pass** |
| Admin lint | `npm run lint` | **Pass** (after Dashboard effect fix) |
| Admin unit tests | *(none configured)* | **N/A** |
| Mobile TypeScript | `npx tsc --noEmit` | **Pass** |
| Mobile lint | `npm run lint` | **N/A** — script not defined in package.json |
| Mobile tests | *(none configured)* | **N/A** |
| Expo doctor | `npx expo-doctor` | **1 known warning** — native folders + app.config prebuild sync (pre-existing CNG note, not introduced by Phase 1) |
| Android build validation | Not run in this slice | **Not run** |

---

## Remaining blockers

### Still blocks full client QA / production

1. **TLS not provisioned on the live API host** — code now refuses cleartext production builds; infrastructure must provide HTTPS (see `HTTPS_DEPLOYMENT_REQUIREMENTS.md`).
2. **Reports screen** still explicitly unavailable (not mocked).
3. **Follow-ups** deferred to v1.1.
4. Some legacy `/api/v1/visits/*` and `/api/v1/farmers/*` detail routes may remain JWT-only (list/create closed); prefer `/mobile/` for field clients.
5. Admin map is marker/list based (no full polyline map library) — adequate for internal QA.

### No longer blocking internal QA of admin core

- Admin login, dashboard, visits, GPS monitoring, employee list paths.

---

## Updated readiness verdict

**Ready for internal QA**

Not ready for limited client QA or production until HTTPS is live on the API and client builds point at it.

---

## Commit strategy (executed separately per repo)

1. Admin selection + authentication + protected routes  
2. Admin dashboard + visits + GPS wiring  
3. Mobile credential security + HTTPS config + follow-up strip + photo queue  
4. Backend auth / `can_login` / device-session hardening + tests  
5. Decision docs (`FOLLOW_UP_DECISION`, `HTTPS_DEPLOYMENT_REQUIREMENTS`, selection/deprecation notices)

No push performed unless explicitly requested.
