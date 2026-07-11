# Kavya Agri Clinic — Complete Functional, Technical & Product Audit

**Audit date:** 11 July 2026  
**Scope:** Mobile field app (`d:\agri-clinic-mobile`), Django backend (`d:\agri_clinic`), admin UIs (`d:\agri_clinic_frontend\agri-admin`, `d:\Agri_frontend_claude\agri-admin-new`)  
**Method:** Static code tracing (UI → API → models). No runtime device tests were executed in this phase. Flows marked *cannot confirm from code* were not verified live.

---

## 1. Executive summary

**Overall readiness: Ready for internal QA**

The **mobile field app** has a coherent, production-oriented core: login with device sessions, workday/GPS duty tracking, a 4-step visit capture flow, offline visit + GPS queues, farmer directory/profile, and diagnostics. Backend APIs for mobile visits, tracking, masters, and admin REST are substantial and partially covered by pytest.

The **product as a whole is not ready for client testing or production** because:

1. **Web admin panels are not usable** — wrong login URLs, placeholder screens, hardcoded dashboard stats, missing GPS/visit/report UIs despite rich backend APIs.
2. **Follow-up workflow is incomplete and misleading** — DB fields exist, mobile submit hardcodes `follow_up_required: false`, Today follow-up carousel is unwired, farmer follow-up sections lack API fields.
3. **Security blockers for production** — cleartext HTTP to production IP, biometric login stores plaintext password, device-session bypass on legacy APIs, `can_login` not enforced on mobile auth.
4. **No remote push notifications** — only local field reminders + REST inbox.
5. **No visit assignment / beat plan** — visits are self-initiated only.

**Honest product status by surface:**

| Surface | Status |
|---------|--------|
| Mobile field ops (visit + GPS + offline) | Ready for **limited internal / friendly field QA** with known caveats |
| Admin monitoring & management | **Not ready for client testing** |
| Full client release | **Not ready** |

---

## 2. Architecture overview

### Repository layout

| Component | Path | Stack |
|-----------|------|-------|
| Mobile field app | `d:\agri-clinic-mobile` | Expo 54, RN 0.81, React 19, React Navigation, Zustand + Context, MMKV, SecureStore |
| Backend API | `d:\agri_clinic` | Django + DRF + SimpleJWT + PostgreSQL (+ optional S3, Redis/Celery) |
| Admin (masters-focused) | `d:\agri_clinic_frontend\agri-admin` | React 19 + Vite + Tailwind + Axios |
| Admin (broader scaffold) | `d:\Agri_frontend_claude\agri-admin-new` | React 19 + Vite + Tailwind + Axios |

The mobile repo does **not** contain backend or admin code. It consumes `http://13.207.17.117/api/v1/` in production builds.

### Architecture diagram

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│  Mobile (Expo / RN)         │     │  Web Admin (Vite React)     │
│  mobile/app + src/          │     │  agri-admin / agri-admin-new│
│  AuthContext, Tracking,     │     │  (incomplete / miswired)    │
│  offlineSyncManager (MMKV)  │     │                             │
└─────────────┬───────────────┘     └─────────────┬───────────────┘
              │ Bearer JWT + X-Device-Session       │ Bearer JWT
              │ /api/v1/mobile/*, tracking/*, …     │ (paths often wrong)
              ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Django REST API  (d:\agri_clinic)                               │
│  mobile_api · visits · farmers · tracking · masters · api/admin  │
│  accounts (JWT, device sessions) · notifications · reports       │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL  ·  Local media or S3 (USE_S3)  ·  EC2 / Render      │
│  Optional Redis/Celery                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Cross-cutting mechanisms

| Concern | Implementation | Key paths |
|---------|----------------|-----------|
| **State** | Zustand (`syncStore`, `visitFormStore`) + React Contexts (Auth, Tracking, OfflineSync, Employee, i18n) | `mobile/lib/store/`, `src/storage/` |
| **API** | Dual clients: fetch (`src/api/client.ts`) + axios (`mobile/lib/api.ts`); both refresh JWT on 401 | `src/api/`, `mobile/lib/*Api.ts` |
| **Auth storage** | Expo SecureStore: access/refresh tokens, device session, session version | `src/storage/tokenStorage.ts`, `deviceSessionStorage.ts` |
| **Offline** | MMKV queues `pending_visits_v1`, `pending_gps_v1` (AsyncStorage fallback); auto-flush on reconnect | `mobile/lib/sync/offlineSyncManager.ts`, `src/tracking/locationSyncService.ts` |
| **GPS** | `expo-location` + `expo-task-manager` background task `KAVYA_BACKGROUND_LOCATION`; duty session APIs | `src/tracking/*` |
| **Notifications** | Local Expo scheduled reminders (water/heat/battery) + REST inbox; **no FCM/APNs push** | `src/notifications/fieldReminderNotifications.ts`, `mobile/lib/notificationsApi.ts` |
| **Uploads** | Multipart XHR for visits/attachments/photos; watermarked visit photos | `mobile/lib/visitSubmitApi.ts`, `src/api/visitAttachments.ts`, `src/utils/multipartUpload.ts` |
| **AWS** | Optional S3 via django-storages; production EC2 IP hardcoded in mobile; no SES/SNS/Cognito | `agri_clinic/config/settings.py`, `src/api/config.ts` |
| **Env / build** | `.env.local`, `.env.production`, `app.config.js`, `eas.json`, GitHub Android APK workflow | mobile root; backend `.env.*.example`, `render.yaml` |

---

## 3. Complete feature inventory

| Module | Feature | Mobile | Admin | Backend | Status | Notes |
|--------|---------|--------|-------|---------|--------|-------|
| Auth | Field employee login | Yes | N/A | `mobile/auth/login/` | Complete | Device session returned |
| Auth | Admin login | N/A | Broken paths | `auth/login/` | Broken | Admin UIs call `/api/auth/login/` (missing `/v1/`) |
| Auth | Token refresh | Yes | Partial | Yes | Complete | Mobile single-flight refresh |
| Auth | Device single-session | Yes | N/A | Yes | Complete | On mobile routes only |
| Auth | Logout | Yes | Token clear | Yes | Complete | |
| Auth | Biometric re-login | Yes | No | N/A | Partial | Stores plaintext password in SecureStore |
| Roles | FieldAgent | Yes | No | Yes | Complete | |
| Roles | Supervisor | Rejected by mobile | No | Same as FieldAgent | Broken | Role exists but no product behavior |
| Roles | Admin (`is_staff`) | Blocked | Intended | Yes | Partial | Backend admin API strong; React admin weak |
| Home | Dashboard KPIs | Yes | Hardcoded (Admin2) | `mobile/dashboard/` | Partial | Mobile OK; follow-up KPIs not from server |
| Home | Pending sync count | Local | No | Returns 0 | Partial | Server always `pending_sync: 0` |
| Farmers | List / search / paginate | Yes | No UI | Yes | Complete | Open directory (not territory-scoped) |
| Farmers | Create (via visit / API) | Yes | No UI | Yes | Complete | Phone uniqueness serializer-only |
| Farmers | Edit profile fields | No | No UI | PUT exists | Missing | Photo edit only on mobile |
| Farmers | Detail + fields/crops | Yes | No UI | Yes | Partial | Multi-field display; visit doesn't bind field |
| Farmers | Duplicate detection | Format only | No | Serializer + audit cmds | Partial | No DB unique on phone |
| Visits | Create 4-step flow | Yes | Placeholder | `mobile/visits/` | Complete | Happy path solid |
| Visits | Assigned / planned visits | No | No | No model | Missing | On-demand only |
| Visits | Start/complete lifecycle | Submit=complete | — | Default status completed | Partial | No active→complete state machine in mobile V2 |
| Visits | Detail + edit notes/photos | Yes | No UI | GET/PATCH | Complete | |
| Visits | History / list | Yes | Placeholder | Yes | Complete (mobile) | |
| Follow-ups | Capture on visit | Hardcoded false | No | Fields exist | Broken | `visitSubmitApi.ts` line 81 |
| Follow-ups | List / overdue / complete | Partial UI | No | No FollowUp model | Partial | Carousel unwired; farmer API lacks dates |
| Follow-ups | Notifications | Client type only | No | No follow_up type | Missing | |
| GPS | Duty start/end | Yes | No UI | Yes | Complete | |
| GPS | Live / bulk upload | Yes | APIs unused | Yes | Complete (mobile) | |
| GPS | Day route map | Yes | No map UI | Admin geo APIs | Partial | Mobile simplifies route well |
| GPS | Mock location detect | No | Suspicion flags | `is_suspicious` | Partial | Heuristics only |
| GPS | Visit geofence | No | No | No | Missing | |
| Offline | Visit queue + retry | Yes | Day-report meta | `local_sync_id` | Complete | Max 3 attempts then failed |
| Offline | GPS queue | Yes | — | bulk endpoints | Complete | Cap 200 points |
| Offline | Farmer-only queue | No | — | — | Missing | Farmer resolved at sync |
| Offline | Bulk visit API | Unused | — | `visits/bulk/` | Not used | Mobile posts one-by-one |
| Notifications | Local field reminders | Yes | N/A | N/A | Complete | Water/heat/battery |
| Notifications | Server inbox | Yes | No UI | Yes | Partial | Types: GPS_OFF, OFFLINE, etc. |
| Notifications | Remote push | No | No | No | Missing | |
| Profile | Photo, stats, settings | Yes | Employee admin APIs | Yes | Partial | Password change API exists; UX unclear |
| Profile | Diagnostics | Yes | Tracking diagnostics API | Yes | Complete (mobile) | |
| Masters | Districts/villages/crops/problems | Read on visit | Partial masters UI | Full CRUD | Partial | Admin1 taluk obsolete |
| Products | Catalogue / prescribe | Advice text only | No | dosage on ProblemMaster only | Missing | No product entity |
| Reports | Field reports | Mobile stub path | Placeholder | Rich APIs | Not used | Admin never wired |
| Audit | Audit logs | No | No UI | `/audit/logs/` | Not used | |
| Import/Export | Problem import | No | No | Import endpoints | Not used | |

---

## 4. End-to-end flow audit

### 4.1 Authentication (mobile)

| Step | Result | Evidence |
|------|--------|----------|
| Login with employee_id/password | Works | `src/api/auth.ts` → `mobile/auth/login/` |
| Reject admin on mobile | Works | `mobile_api/auth.py`, `isFieldEmployee()` |
| Reject Supervisor on mobile | Works as gate, product-broken | `src/api/employees.ts` — Supervisor fails `isFieldEmployee` |
| Persist tokens + device session | Works | SecureStore keys in `tokenStorage.ts` |
| Bootstrap / remembered session | Works | `AuthContext.tsx` + `auth/me/` |
| Token refresh on 401 | Works | `tokenRefresh.ts`, client interceptors |
| Session replaced (other device) | Works on mobile APIs | 409 `SESSION_REPLACED` |
| Invalid credentials / network fail | Works (handled) | Login screen error paths |
| `can_login=False` while JWT valid | Gap | Mobile login checks `is_active_employee`, not `can_login`; JWT not revalidated for employee flags per request |
| Unauthorized API | Works | Refresh then session expired teardown |

### 4.2 Home dashboard

| Element | Result | Notes |
|---------|--------|-------|
| Greeting / date | Works | `mobile/app/(tabs)/index.tsx` |
| Workday hero / status | Works | `fetchWorkStatus`, TrackingContext |
| Visit counts / coverage / distance | Works | `mobile_dashboard_metrics` |
| Follow-ups due | Misleading | Derived client-side from visits if any; server omits follow-ups; carousel not mounted |
| Pending sync | Local only | Backend returns 0 |
| Quick actions / empty / loading | Works | Skeleton + banners present |
| Notifications badge | Works | `getBadgeCount` |

### 4.3 Farmer management

| Flow | Result |
|------|--------|
| List / search / open by ID | Works — `farmer/[id].tsx`, directory by PK |
| Create during visit | Works online; offline deferred to sync |
| Edit non-photo fields | Missing in mobile UI |
| Duplicate phone | Server create validation; DB allows duplicates |
| Multiple farms | Display yes; visit does not select `field` FK |
| Consent / preferred language | Missing models/UI |

### 4.4 Visit lifecycle (critical path)

| # | Step | Status |
|---|------|--------|
| 1–2 | Visit assigned / shown as assignment | **Missing** — no assignment model |
| 3 | User opens visit flow | Works |
| 4 | GPS permission | Works — gates + modals |
| 5–6 | Travel / start | Workday start is the gate; no separate visit-start |
| 7 | Arrival GPS | Captured at submit (step 4), not separate arrival event |
| 8–10 | Farmer / crop / observation | Works (UI validation) |
| 11 | Images | Works; online may lose photos after visit saved |
| 12–13 | Recommendation / product | Advice fields work; no product catalog |
| 14 | Follow-up date | **Broken** — always `follow_up_required: false` |
| 15–16 | Complete + location | Submit creates completed visit |
| 17 | Online / offline save | Works with `local_sync_id` |
| 18 | History | Works |
| 19 | Admin sees visit | Backend yes; **admin UI no** |
| 20 | Reports updated | Backend APIs exist; **admin unused** |

**Duplicate completion:** Mitigated by `local_sync_id` uniqueness.  
**Geofence / wrong visit:** Not enforced.  
**App kill mid-visit:** Form is in Zustand (in-memory) — risk of draft loss if process killed before enqueue (cannot fully confirm persistence of mid-flow draft from code without runtime test). Queue after offline submit is durable in MMKV.

### 4.5 Follow-up workflow

| Capability | Status |
|------------|--------|
| Create follow-up on visit | Broken (hardcoded false) |
| Assignment / reminders / deep link | Missing |
| List / overdue | Partial / empty (missing farmer fields; carousel unused) |
| Complete / reschedule / cancel | Missing first-class UX (new visit = implicit complete) |
| Admin visibility | Missing UI |

Backend intentionally simplified (`mobile_api/tests/test_visit_workflow_simplified.py`); mobile UI still partially assumes follow-ups exist → product inconsistency.

### 4.6 GPS & travel

Works for duty start/end, filtered uploads, bulk sync, Day tab journey markers (start → visits → live), route simplification (`simplifyRouteForMap`).  
Missing: mock GPS detection on device, visit radius check, admin live map UI.  
Expo Go: background tracking disabled (dev build/APK required).

### 4.7 Offline

| Scenario | Status |
|----------|--------|
| Visit complete offline | Works |
| Images offline | Queued in payload; uploaded after visit POST |
| GPS offline | Queued; may drop oldest beyond 200 |
| Farmer create offline | Partial — embedded in visit sync |
| Token expiry mid-sync | Refresh; queue retained on auth failure |
| Partial sync (visit OK, photo fail) | Online: visit kept, photos warned; offline: queue retained |
| Sync conflict | Visit dedup works; farmer race possible |
| Silent loss | Failed visits after 3 non-network attempts stay as `failed` (not silent, but easy to miss) |

### 4.8 Notifications

Local reminders: Works.  
Server inbox: Partial.  
Push / follow-up / deep link to deleted targets: Missing / unconfirmed.

### 4.9 Admin panel

| Area | Admin1 | Admin2 | Backend |
|------|--------|--------|---------|
| Login | Broken URL | Broken URL | Works |
| Masters | Mostly wired; taluk dead; district field name mismatch | Districts only | Full |
| Dashboard / visits / reports / GPS / farmers | Absent | Placeholders / hardcoded | Full APIs |
| Route guards | ProtectedRoute | **Missing** | N/A |

### 4.10 Admin login (broken)

```12:15:d:\agri_clinic_frontend\agri-admin\src\pages\auth\LoginPage.tsx
        const res = await axios.post(
            "http://127.0.0.1:8000/api/auth/login/",
            { username, password }
```

Backend expects `/api/v1/auth/login/`.

---

## 5. Critical issues

| # | Severity | File / function | Root cause | User impact | Recommended fix |
|---|----------|-----------------|------------|-------------|-----------------|
| C1 | **Critical** | `src/api/config.ts`, `app.config.js`, `.env.production` | Production API is `http://` cleartext | Token/PII interception | Terminate TLS (HTTPS) on API; update mobile base URL; disable cleartext in release |
| C2 | **Critical** | Admin `LoginPage.tsx` / `auth.api.ts` | Wrong login path (`/api/auth/` vs `/api/v1/auth/`) | Admins cannot log in | Fix base URL + path; env-driven API host |
| C3 | **Critical** | `mobile/lib/visitSubmitApi.ts` `buildVisitFormValuesFromStore` | `follow_up_required: false` always | Follow-ups never saved; managers cannot rely on due lists | Wire store fields into submit; add step UI; align dashboard API |
| C4 | **High** | `src/storage/biometricLoginStorage.ts` | Plaintext password in SecureStore | Credential theft if device compromised | Prefer refresh-token / biometric-gated session; never store password |
| C5 | **High** | `visits/views.py`, `farmers/views.py` (legacy) | Device session not required; JWT-only | Stolen JWT usable without device session for 12h | Require device session on employee write APIs or deprecate legacy routes |
| C6 | **High** | `mobile_api/auth.py` vs `accounts/views.py` | Mobile ignores `can_login` | Disabled users may still operate until JWT expires | Enforce `can_login` + `is_active_employee` on login, refresh, and authenticated mobile views |
| C7 | **High** | Admin2 `Dashboard.tsx`, `Visits.tsx`, `Reports.tsx` | Hardcoded / empty placeholders | Client thinks monitoring works | Wire to `/api/v1/dashboard/*`, `/api/v1/admin/visits/`, reports; or hide nav |
| C8 | **High** | Online photo path in `create-step4-review.tsx` | Visit POST succeeds before attachments guaranteed | Visit without evidence | Transactional strategy: upload then finalize, or retry attachment job + admin flag |
| C9 | **High** | `farmers/serializers.py` vs `masters.Farmer.phone` | Phone unique in serializer, not DB | Duplicate farmers under race / imports | Unique constraint (nullable-safe) + merge tooling |
| C10 | **Medium** | `FollowUpCarousel.tsx` unused; `workQueue.ts` expects farmer follow-up fields | UI without data contract | Empty / wrong follow-up sections | Either ship follow-ups end-to-end or remove misleading UI |
| C11 | **Medium** | `visits/field_visit.py` legacy path | Mobile hits legacy validation; skips acreage/problem rules | Inconsistent data quality | Align mobile payload with field-visit validation or tighten legacy path |
| C12 | **Medium** | Supervisor role | No elevation; mobile rejects | Confusing HR/role setup | Define Supervisor product rules or remove role |
| C13 | **Medium** | GPS queue max 200 | Long offline duty drops oldest points | Incomplete travel history | Increase cap, prioritize keep start/end/visit anchors, warn user |
| C14 | **Medium** | Admin2 `AppRoute.tsx` | No ProtectedRoute on dashboard | Unauthenticated UI access (API still needs JWT) | Wrap all authenticated routes |
| C15 | **Low–Med** | Dual HTTP clients + legacy screens | Maintenance / confusion | Regression risk | Consolidate client; delete or quarantine unwired screens |

---

## 6. Missing validations and edge cases

### Missing / weak business rules

- Visit geofence / max distance from farmer GPS  
- Mandatory photo for certain problem severities (not enforced server-side)  
- Acreage / field binding on visit (mobile sends empty `land_area`)  
- Follow-up date required when `follow_up_required` true (mobile never sets true)  
- Territory-scoped farmer access  
- Farmer consent capture  
- Device time skew rejection on GPS `recorded_at`  
- Login throttle not applied to login views despite settings rate  
- Soft-delete / tombstone sync when server deletes visit while offline  

### Edge-case matrix

| Case | Handled? |
|------|----------|
| Same farmer twice / same mobile | Partial (serializer; no DB unique) |
| Wrong territory assignment | Not enforced (open directory) |
| Visit deleted after offline download | Not clearly handled |
| Farmer edited offline + online | Partial (no conflict resolver) |
| Visit completed on two devices | Partial (`local_sync_id`; session replace) |
| Image OK / visit fail | Offline retries; online reverse is weaker |
| Visit OK / follow-up fail | N/A — follow-up not submitted |
| Invalid GPS coords | Partial client + server range checks |
| Device / server time skew | Not clearly handled |
| Device change | Works (new session; old 409) |
| Account disabled while offline | Weak until JWT expires |
| Old token during sync | Refresh; then stop |
| MMKV schema evolution | Key versioning only (`_v1`), no migrations framework |
| Large image / slow network | Size limits server-side; UX retry partial |
| Server 500 / AWS down | Queue retention; user must retry |
| Double-tap submit | Mitigated on visit submit button |

---

## 7. API integration gaps

| Client expectation | Backend reality | Gap |
|--------------------|-----------------|-----|
| Admin `/api/auth/login/` | `/api/v1/auth/login/` | Broken admin login |
| Admin `/api/accounts/employees/` | `/api/v1/employees/` | Broken employee CRUD |
| Admin taluks | Model deleted (migration 0009) | Dead UI |
| Admin `district_name` | `name` | Create may fail |
| Admin `.../restore/` | No restore actions | Dead calls |
| Mobile follow-ups on dashboard | Metrics omit follow-ups | Client invents from visits |
| Mobile farmer `follow_up_date` | Farmer serializers omit | Work queue empty |
| Mobile `visits/bulk/` | Exists | Unused |
| Admin live GPS / day-report | Full tracking admin APIs | No UI |
| Mobile push token register | — | Endpoint/UI missing |
| Product / order APIs | — | Missing entirely |
| CRM routes | `crm/urls.py` unmounted | Dead module |

**Unused backend (examples):** rich `/api/v1/reports/*`, `/api/v1/dashboard/*`, tracking `admin/geo/*`, audit logs, system settings, `visits/bulk/`, recommendations admin CRUD, problem import.

**Missing for product:** visit assignment, follow-up entity or first-class API, push registration, territory APIs, product catalog.

---

## 8. Missing use cases (classified)

| Use case | Classification | Rationale |
|----------|----------------|-----------|
| Working admin: login, visits, GPS map, employees | **Must have before client release** | Client cannot supervise field force |
| HTTPS / secure transport | **Must have before client release** | Security |
| Follow-up capture + due list **or** remove UI claims | **Must have before client release** | Avoid false expectations |
| Enforce `can_login` + close session bypass | **Must have before client release** | Security / offboarding |
| Photo retry after online visit save | **Must have before client release** | Evidence integrity |
| Farmer phone DB uniqueness | **Must have before client release** | Data integrity |
| Farmer edit on mobile | **Important for v1.1** | Field corrections |
| Bind visit to specific field/land | **Important for v1.1** | Multi-farm farmers |
| Territory-scoped farmers | **Important for v1.1** | Scale / privacy |
| Visit assignment / daily plan | **Important for v1.1** | Manager workflow |
| Reports export Excel/PDF in admin | **Important for v1.1** | Management |
| Mock GPS detection | **Important for v1.1** | Compliance |
| Product catalogue + recommendation qty | **Useful for future** | Sales/advisory depth |
| Pest outbreak / weather alerts | **Useful for future** | Ops scale |
| WhatsApp / SMS advisory | **Useful for future** | Communication |
| Geo farm boundary polygons | **Useful for future** | Precision |
| Group meetings / demos / campaigns | **Useful for future** | Beyond 1:1 visits |
| Device binding beyond session | **Useful for future** | Extra lock-down |
| Seasonal crop history analytics | **Useful for future** | Agronomy |
| Distributor / dealer referral | **Not required for this app** (unless sales is in scope) | Current app is clinic/advisory |
| Full CRM module revive | **Not required** | Unmounted; avoid scope creep |

---

## 9. Release priority

### P0 — Must fix before client testing

1. Fix admin authentication and pick **one** admin app; wire dashboard + visit list at minimum  
2. HTTPS for production API + mobile config  
3. Decide follow-up product: implement end-to-end **or** remove follow-up UI/KPIs  
4. Enforce `can_login` / active employee on mobile auth + requests  
5. Stop storing plaintext passwords for biometrics  
6. Reliable visit evidence upload (retry / status)  
7. Farmer phone uniqueness at DB level  

### P1 — Must fix before production

1. Close device-session bypass on legacy employee write APIs  
2. Admin: live GPS map, employee management, basic reports  
3. Align visit validation (legacy vs field-visit)  
4. Supervisor role behavior  
5. Territory or assignment scoping (at least assigned_employee filter option)  
6. Rate-limit login endpoints  
7. Audit logging for admin critical actions  

### P2 — Version 1.1

1. Farmer edit, field selection on visit, visit assignment  
2. Mock GPS detection, optional geofence  
3. Push notifications  
4. Export reports, offline sync health dashboard  
5. Consolidate dual API clients; remove dead screens  

### P3 — Future

1. Product catalog, SMS/WhatsApp, campaigns, farm boundaries, advanced agronomy  

---

## 10. Recommended implementation sequence

1. **Stabilize security baseline** — HTTPS, `can_login`, biometric storage, login throttle  
2. **Unblock admin** — fix auth paths, env config, ProtectedRoute; wire Dashboard + Visits + Employees against existing admin APIs (do not rebuild backend)  
3. **Resolve follow-ups product decision** — implement submit + list + dashboard **or** strip UI and document “simplified visit workflow”  
4. **Harden visit evidence + offline** — attachment retry, failed-queue UX, farmer unique phone  
5. **Close API gaps** — deprecate or protect legacy `/api/v1/visits|farmers` without device session  
6. **Validation alignment** — one server validation path matching mobile payload  
7. **v1.1 features** — assignment, territory, push, reports polish  
8. **Avoid** rewriting mobile architecture, reviving CRM, or building a second admin from scratch until one admin is production-usable  

---

## 11. Test checklist

### Android mobile app

- [ ] Login success / failure / offline login attempt  
- [ ] Session restore after app kill  
- [ ] Second device login → first device 409 / forced logout  
- [ ] Supervisor account behavior (document expected)  
- [ ] Admin account rejected on mobile  
- [ ] Start workday with GPS denied / accuracy poor  
- [ ] Background tracking on release APK (not Expo Go)  
- [ ] Create visit existing farmer (all 4 steps)  
- [ ] Create visit new farmer  
- [ ] Offline visit + photos → reconnect → sync success  
- [ ] Double-tap submit does not duplicate (`local_sync_id`)  
- [ ] Photo failure after online visit → visible warning + recoverable  
- [ ] Visit detail edit notes + add photo  
- [ ] Farmer open by ID from list and from visit  
- [ ] Day tab route: start, visit markers, end/live  
- [ ] End workday stops tracking + reminders  
- [ ] Pending sync screen retry failed items  
- [ ] Biometric login (if enabled) after password change  
- [ ] Language switch EN/TA  
- [ ] Notifications inbox read/unread  

### Web admin

- [ ] Login against `/api/v1/auth/login/`  
- [ ] Token expiry / protected routes  
- [ ] Dashboard live stats  
- [ ] Employee create / toggle / reset password  
- [ ] Farmer list / assign employee  
- [ ] Visit list / detail / attachments  
- [ ] Live map + historical route  
- [ ] Masters CRUD (district, village, crop, problems) — no taluk  
- [ ] Reports load without placeholders  
- [ ] Mobile responsiveness of layout  

### Backend API

- [ ] `/healthz/`  
- [ ] Mobile login + device session enforcement  
- [ ] Visit create idempotency (`local_sync_id`)  
- [ ] Location bulk (suspicious points flagged)  
- [ ] Admin-only routes reject field JWT  
- [ ] Media upload size/type rejection  
- [ ] `can_login=false` cannot obtain/use tokens  
- [ ] OpenAPI docs access policy in production  

### Offline / GPS / notifications / AWS

- [ ] Airplane mode visit + GPS → sync  
- [ ] Queue survives app restart  
- [ ] GPS point cap behavior documented  
- [ ] Local reminders only when workday active  
- [ ] S3 media URLs when `USE_S3=true`  
- [ ] EC2/Render deploy + migrate + static/media  

---

## 12. Final recommendation

**Implement now (before any client demo of the full product):**

1. One working admin: auth + dashboard + visits + employees + GPS viewer (consume existing backend)  
2. Production HTTPS  
3. Follow-up honesty: ship or strip  
4. Auth hardening (`can_login`, biometric, session bypass)  
5. Visit photo reliability + farmer phone uniqueness  

**Postpone:**

- Product commerce, WhatsApp/SMS, campaign modules, farm polygons, CRM revival, architectural mobile rewrite, building a second parallel admin  

**Do not claim production readiness** until admin supervision and transport security are fixed. The mobile happy path is strong enough for **internal field QA** and carefully scoped **limited field-only client pilots**, provided stakeholders accept: no usable web monitoring yet, no assigned visit plans, and follow-ups not operational.

---

## Appendix A — Role matrix

| Role | Login | Mobile | Admin UI | Backend |
|------|-------|--------|----------|---------|
| FieldAgent | Mobile login | Full field app | No | Employee APIs + device session |
| Supervisor | Mobile login allowed by API | **Signed out** by `isFieldEmployee` | No | Same permissions as FieldAgent |
| Admin (`is_staff`) | `/api/v1/auth/login/` | Rejected | Intended; currently broken UI | `IsAdminUser` admin APIs |
| Farmer | N/A | N/A | N/A | Data subject only |
| Distributor | N/A | N/A | N/A | Not modeled |

**UI-only controls without matching backend:** mobile field-employee gate (backend also blocks staff on mobile login, but Supervisor mismatch remains); Admin2 unauthenticated route shells; any future territory UI without queryset filters.

---

## Appendix B — Key file index

| Area | Paths |
|------|-------|
| Mobile navigation | `src/navigation/RootNavigator.tsx`, `VisitFlowNavigator.tsx` |
| Visit submit | `mobile/lib/visitSubmitApi.ts`, `mobile/app/visit/create-step*.tsx` |
| Offline sync | `mobile/lib/sync/offlineSyncManager.ts` |
| GPS | `src/tracking/backgroundLocationService.ts`, `locationSyncService.ts`, `TrackingContext.tsx` |
| Auth | `src/storage/AuthContext.tsx`, `mobile_api/auth.py`, `accounts/device_sessions.py` |
| Visit model | `agri_clinic/visits/models.py` |
| Dashboard metrics | `agri_clinic/mobile_api/dashboard_metrics.py` |
| Admin APIs | `agri_clinic/api/admin/` |
| Tracking admin | `agri_clinic/tracking/urls.py` |

---

*End of audit. No application code was modified during this phase.*
