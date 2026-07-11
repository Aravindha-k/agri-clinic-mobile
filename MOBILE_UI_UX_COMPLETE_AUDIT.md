# Mobile UI/UX Complete Audit — Kavya Agri Clinic

**Date:** 11 July 2026  
**Repo:** `d:\agri-clinic-mobile`  
**Method:** Static review of wired screens, theme, and components. No code changes. No redesigns.  
**Companion docs:** `MOBILE_SCREEN_INVENTORY.md`, `DESIGN_SYSTEM_AUDIT.md`

---

## 1. Executive summary

The field app has a **strong product foundation**: clear tab IA (Today / Work / Visit FAB / Day / Me), a coherent 4-step visit wizard, bilingual EN/TA support, offline banners, GPS workday gating, and a emerging V2 visual language (deep clinic green, warm paper backgrounds, 52px primary CTAs).

It is **not yet production-quality enterprise UX**. Gaps that matter most for field officers are:

1. **Touch-target and outdoor-readability risks** (small icon buttons, glass headers, `text3`/`text4` on bright sun).  
2. **Form inconsistency** (`EnterpriseTextField` unused; raw inputs; keyboard types uneven).  
3. **Design-system fragmentation** (multiple token files, duplicate components).  
4. **Navigation aliases without distinct UX** (Live Map / Travel History = My Location).  
5. **Incomplete workday end confirmation** and some misleading follow-up UI (already stripped in Phase 1 product work).  
6. **Accessibility partial** — roles present on many controls; labels incomplete; font scaling not systematically tested.

### Overall UI/UX maturity: **68 / 100**

### Recommendation

**Good foundation, targeted improvements needed**

Not “needs major redesign.” Not “production-quality enterprise UX.” Closest to: *Ready for internal / friendly client demo after P0 polish; production after P0+P1.*

---

## 2. Screen inventory

See **`MOBILE_SCREEN_INVENTORY.md`** for the full list.

**Wired core journey:** Splash → Login → Today → Work (queue/visits) → Visit FAB (4 steps) → Success → Day → Me (profile/settings/diagnostics/offline sync/notifications).

**Legacy debt:** ~15 unwired `src/screens/*` files plus duplicate UI kits.

---

## 3. Screen-by-screen review

Scores: UI / UX / Accessibility / Performance perception / Consistency / Overall (each /10).

### Splash / bootstrap

| Screen | UI | UX | A11y | Perf | Cons. | Overall | Notes |
|--------|----|----|------|------|-------|---------|-------|
| Cinematic splash | 8 | 7 | 5 | 8 | 7 | **7.0** | Branded, capped 3s. Auth hydrate is blank View — no branded loader. |
| Auth blank | 2 | 4 | 2 | 6 | 3 | **3.4** | Feels like a freeze on slow devices. |

**Recommendations:** Branded splash/skeleton while `isReady`; avoid empty frame (P1).

---

### Login

| Screen | UI | UX | A11y | Perf | Cons. | Overall | Notes |
|--------|----|----|------|------|-------|---------|-------|
| Login | 7 | 7 | 5 | 7 | 5 | **6.2** | Clear hierarchy; employee ID + password; biometric; error states OK. Eye-toggle hit area small. Gradient CTA ≠ PrimaryButton. Diagnostics panel good for support, noisy for field staff. |

**Field notes:** High contrast form on white is good in sun. One-handed: CTA placement OK. Keyboard: ensure numeric/phone where needed on related flows.

**P0:** Enlarge password visibility control to ≥48dp.  
**P1:** Use shared PrimaryButton; collapse diagnostics behind “Advanced”.  
**P2:** Autofill / employee ID keyboard type check.

---

### Today (Home dashboard)

| Screen | UI | UX | A11y | Perf | Cons. | Overall | Notes |
|--------|----|----|------|------|-------|---------|-------|
| Today | 8 | 7 | 6 | 7 | 7 | **7.0** | Workday-first hierarchy is correct for field ops. Skeleton present. Offline + inactive banners help. Glass/header sheen may reduce outdoor clarity. Decorative nature art adds polish but scroll length + visual noise. |

**Hierarchy:** Where am I — clear. What to do — Start/continue workday + Visit FAB. Secondary actions (notifications, quick actions) compete slightly.

**P0:** Ensure primary CTA (start day / continue) survives fold on small Android.  
**P1:** Reduce glass opacity or solid header for sunlight; trim decorative density.  
**P2:** Compress quick actions to 2–3 field essentials.

---

### Work — farmer queue & visits

| Screen | UI | UX | A11y | Perf | Cons. | Overall | Notes |
|--------|----|----|------|------|-------|---------|-------|
| Work home | 8 | 8 | 6 | 7 | 8 | **7.4** | Clean segment bar; compact header; thin orchestration. |
| Queue panel | 7 | 7 | 6 | 7 | 7 | **6.8** | Search + village filter; skeletons/empty. Follow-up section intentionally emptied (product). |
| Visits panel | 7 | 7 | 6 | 7 | 7 | **6.8** | List + pending sync cards; empty/retry. Pagination/search limits depend on API. |
| Farmer detail | 7 | 8 | 6 | 6 | 7 | **6.8** | Strong for revisit + map + history. Long scroll. Photo edit OK; profile field edit missing. |
| Farmer map | 7 | 7 | 5 | 6 | 6 | **6.2** | Directions useful. Map a11y limited. |

**P0:** Keep list row tap targets full-row ≥48dp; avoid tiny trailing icons only.  
**P1:** Faster path: long-press or primary “Start visit” on farmer card (fewer taps).  
**P2:** Sticky filters; infinite scroll polish.

---

### Visit flow (critical path)

| Screen | UI | UX | A11y | Perf | Cons. | Overall | Notes |
|--------|----|----|------|------|-------|---------|-------|
| Step 1 Farmer | 7 | 7 | 5 | 6 | 6 | **6.2** | Powerful but long (~670 lines UI). New farmer form raw inputs. GPS gating correct. |
| Step 2 Crop/problem | 7 | 8 | 6 | 6 | 7 | **6.8** | Chip + searchable masters — good for gloves if chips are large enough. Tamil names help. |
| Step 3 Notes/photos | 6 | 7 | 5 | 6 | 5 | **5.8** | Multiline raw TextInput; photo remove hitSlop 8 only. Media buttons OK if ≥48 tall. |
| Step 4 Review | 8 | 8 | 6 | 7 | 7 | **7.2** | Clear summary; edit links; PrimaryButton submit; offline queue messaging. Edit text links small. |
| Success | 8 | 8 | 6 | 8 | 8 | **7.6** | Clear next actions. |
| Visit detail | 7 | 7 | 6 | 6 | 7 | **6.6** | Edit notes/photos; photo viewer. Dense. |

**Field productivity:** 4 steps is justified for data quality; still too much scroll on low-end devices. Workday gate + GPS before submit are correct for compliance.

**P0:** Enlarge Step 4 “Edit” hit targets; photo remove controls ≥48dp.  
**P1:** Shared text fields; sticky primary CTA on steps 1–3; reduce Step 1 density.  
**P2:** Remember last crop/village; optional “quick revisit” already exists — promote it.

---

### Day / GPS / maps

| Screen | UI | UX | A11y | Perf | Cons. | Overall | Notes |
|--------|----|----|------|------|-------|---------|-------|
| Day summary | 8 | 7 | 6 | 7 | 7 | **7.0** | KPI + route + recent visits. Dark hero readable outdoors. End-of-day confirm unclear. |
| My Location | 7 | 6 | 5 | 6 | 5 | **5.8** | Useful but LiveMap/TravelHistory aliases confuse IA. |

**P0:** Distinct Travel History UX or remove/hide alias routes from product language.  
**P1:** Explicit End Workday button + confirm sheet.  
**P2:** Simplify map chrome for one-handed use.

---

### Notifications / Offline / Profile / Settings

| Screen | UI | UX | A11y | Perf | Cons. | Overall | Notes |
|--------|----|----|------|------|-------|---------|-------|
| Notifications | 7 | 7 | 6 | 7 | 7 | **6.8** | Filters + empty state. Deep links exist. |
| Offline Sync | 8 | 8 | 7 | 7 | 9 | **7.8** | Best consistency example. Clear queue + Sync. |
| Profile | 7 | 7 | 6 | 6 | 6 | **6.4** | Menu clear; monolith; sync card good. |
| Settings | 6 | 7 | 6 | 7 | 5 | **6.2** | Language EN/TA essential. Theme toggle vs static Colors = mismatch. |
| Help | 6 | 7 | 6 | 8 | 6 | **6.6** | Useful tips. |
| Diagnostics | 6 | 6 | 5 | 7 | 6 | **6.0** | Right for support; keep out of primary path. |
| Problems catalog | 7 | 7 | 6 | 6 | 7 | **6.6** | Searchable reference — field value high. |

**P1:** Settings “theme” should match real behavior or be removed.  
**P2:** Split Profile into sub-screens to shorten scroll.

---

### Permission / error / empty / loading

| Pattern | Assessment |
|---------|------------|
| Location Alerts | Clear copy; Open Settings path — good |
| Camera/gallery | Present; verify Tamil strings |
| Skeletons | Today/Day/Work — good perceived performance |
| EmptyState | Consistent on V2 paths |
| Error boundaries | Present; fallback UI sparse |
| GlobalStatusStrip | Excellent for offline field work |
| Session expiry | Handled in auth (product); login notice — keep message short |

---

## 4. Design system review

See **`DESIGN_SYSTEM_AUDIT.md`**.

**Headline:** Consolidate on `mobile/lib/theme.ts` + `mobile/components/ui`; adopt `EnterpriseTextField`; deprecate duplicate `src` primitives; archive dead screens.

**Consistency score: 5 / 10**

---

## 5. Visual consistency review

| Element | Finding |
|---------|---------|
| Brand green | Mostly aligned to brand; lightTheme/harvest variants leak |
| Cards | 16 / 18 / 24 radius mix |
| Buttons | Height 40–52; 4 implementations |
| Headers | 5+ patterns |
| Shadows | 3+ systems |
| Icons | Lucide on tabs (good); Ionicons mixed elsewhere |
| Animations | Entrance polish present; keep subtle for low-end devices |

**Do not redesign brand.** Normalize tokens and component usage.

---

## 6. Accessibility review

| Area | Status |
|------|--------|
| PrimaryButton a11yRole | Present |
| Tab bar labels | Present |
| Many Pressables | Role yes; labels incomplete |
| Touch targets | Primary CTAs 52px good; back/eye/edit/remove often &lt;48dp |
| Contrast | `text1`/`text2` good; `text3`/`text4` and glass risky outdoors |
| Font scaling | Not systematically constrained/tested |
| Screen reader | Partial; forms lack consistent field labeling |
| One-handed | FAB center good; top-right notifications harder |
| Dark mode | ThemeProvider exists; active UI ignores it |

**Field a11y P0:** ≥48dp on all destructive/secondary icon buttons in visit flow and login.

---

## 7. Enterprise readiness score: **64 / 100**

Compared on *clarity / workflow / productivity / polish* (not visual cloning):

| Benchmark trait | Kavya today |
|-----------------|-------------|
| Clear “day at work” model | Strong (workday + Today/Day) |
| Task-first visit capture | Strong (4-step) |
| Offline honesty | Strong (strip, sync screen) |
| Dense but scannable lists | Good (Work) |
| Ruthless tap reduction | Medium |
| Bulletproof form system | Weak |
| System consistency | Medium-weak |
| Accessibility maturity | Medium-weak |

Feels closer to a **modern agriculture field MVP with premium polish** than Salesforce Field Service maturity — which is fine if P0/P1 close the operational gaps.

---

## 8. Field usability score: **66 / 100**

| Condition | Rating | Comment |
|-----------|--------|---------|
| Bright sunlight | Medium | Dark hero good; glass + muted text risk |
| One-handed | Medium-high | FAB + bottom tabs help; header actions harder |
| Gloves / dusty hands | Medium | Large CTAs help; chips/icons need size audit |
| Standing / few seconds | Medium | Visit still multi-step (necessary); promote fast revisit |
| Poor network | High | Offline banners + queue + sync — strong |
| Low-end Android | Medium | Heavy decoration/animations; large screens |
| Long day fatigue | Medium | Hierarchy mostly clear; scroll fatigue on Profile/Visit1 |
| EN + Tamil | High | Catalogs + i18n present |

**Highest-ROI field changes:** bigger secondary controls, sunlight-safe headers, sticky submit, fewer taps from farmer card → visit, end-workday clarity.

---

## 9. React Native architecture observations

| Observation | Impact |
|-------------|--------|
| Dual `mobile/` + `src/` trees | Maintenance / inconsistency |
| Large screen files (600–700+ lines) | Hard to keep UX consistent |
| Zustand visit form + contexts | Appropriate; keep |
| Theme static imports | Blocks dark mode; simplifies light mode |
| StyleSheet + tokens mixed with literals | Drift |
| Navigation aliases without UI | Confusing product surface |
| Dead legacy screens | Noise for future UX work |

**Recommend (no business logic change):** ScreenScaffold, form primitives, archive unwired screens, single button/chip/empty exports. Avoid rewriting navigation or visit state machine.

---

## 10. Prioritized improvement backlog

### P0 — Before client demo

| ID | Improvement | Effort | Why |
|----|-------------|--------|-----|
| P0-1 | ≥48dp hit areas: login eye, visit edit/remove, compact back | S | Gloves / errors |
| P0-2 | Sunlight-safe Today header (less glass / higher contrast) | S | Outdoor readability |
| P0-3 | Ensure Start Workday / primary action visible above fold on small phones | S | First-job clarity |
| P0-4 | Clarify or hide Live Map / Travel History aliases | S | Prevent “broken history” perception |
| P0-5 | End Workday confirm UI wired and obvious on Day tab | S | Operational completeness |

### P1 — Before production

| ID | Improvement | Effort | Why |
|----|-------------|--------|-----|
| P1-1 | Adopt EnterpriseTextField + TextArea on Login + visit forms | M | Consistency / a11y |
| P1-2 | Single PrimaryButton/GhostButton; deprecate duplicates | M | Consistency |
| P1-3 | Sticky footer CTA on visit steps 1–3 | S | Fewer scrolls |
| P1-4 | Farmer card primary “Start visit” | S | Tap reduction |
| P1-5 | Auth hydrate branded loader | S | Perceived quality |
| P1-6 | Settings theme control matches reality | S | Trust |
| P1-7 | Token consolidation doc + kill conflicting radius defaults on active paths | M | Consistency |
| P1-8 | Tamil completeness pass on visit + permission strings | M | Regional users |
| P1-9 | Reduce decorative motion on low-end (respect reduced motion if available) | S | Performance |

### P2 — Good improvements

| ID | Improvement | Effort |
|----|-------------|--------|
| P2-1 | ScreenScaffold | M |
| P2-2 | ConfirmDialog component | S |
| P2-3 | Sheet primitive | M |
| P2-4 | Split Profile screen | M |
| P2-5 | Archive unwired `src/screens` | S |
| P2-6 | Font scaling QA pass | M |
| P2-7 | Distinct Travel History if product needs it | L |

### P3 — Future

| ID | Improvement | Effort |
|----|-------------|--------|
| P3-1 | True dark mode via tokens | L |
| P3-2 | Advanced a11y (TalkBack full labels) | L |
| P3-3 | Adaptive density / large-control mode for gloves | L |
| P3-4 | Offline illustration system refresh | M |

---

## 11. Estimated effort summary

| Band | Items | Rough total |
|------|-------|-------------|
| P0 | 5 | ~2–4 engineer-days |
| P1 | 9 | ~1.5–2.5 engineer-weeks |
| P2 | 7 | ~1–2 engineer-weeks |
| P3 | 4 | Backlog |

---

## 12. Before / after mock descriptions (text only)

### Login password toggle
- **Before:** Small eye icon with ~4px padding inside input.  
- **After:** 48×48 pressable affixed to input trailing edge; same visual style.

### Today header in sunlight
- **Before:** Frosted glass with soft secondary text.  
- **After:** Solid or high-opacity warm surface; `text1` title; notification bell with 48dp target and clear badge.

### Visit Step 4 edit links
- **Before:** Text “Edit” with hitSlop 8.  
- **After:** Ghost chip button “Edit section” ≥48dp height, right-aligned in section header.

### Farmer → Visit
- **Before:** Open farmer → scroll → start visit.  
- **After:** Queue card shows primary green “Visit” button; detail still available via secondary chevron.

### Day end
- **Before:** Workday ends ambiguously / hard to find.  
- **After:** Day tab sticky “End workday” with confirm sheet (duration + distance summary).

### Auth loading
- **Before:** Blank view.  
- **After:** Mini branded loader on paper background matching splash colors.

---

## 13. Recommended implementation order

1. **P0 touch + contrast + workday end + map alias honesty** (demo safety).  
2. **P1 sticky CTAs + farmer Start Visit** (speed).  
3. **P1 form fields + button unification** (craft + fewer bugs).  
4. **P1 token consolidation on active paths** (stop new drift).  
5. **P2 ScreenScaffold + archive dead screens** (maintainability).  
6. **P3 dark mode / advanced a11y** only after production field feedback.

Do **not** redesign the visit step model, tab IA, or brand palette as part of polish.

---

## Scoring roll-up (wired primary screens)

| Screen | UI | UX | A11y | Perf | Cons. | Overall |
|--------|----|----|------|------|-------|---------|
| Splash | 8 | 7 | 5 | 8 | 7 | 7.0 |
| Auth blank | 2 | 4 | 2 | 6 | 3 | 3.4 |
| Login | 7 | 7 | 5 | 7 | 5 | 6.2 |
| Today | 8 | 7 | 6 | 7 | 7 | 7.0 |
| Work home | 8 | 8 | 6 | 7 | 8 | 7.4 |
| Farmer detail | 7 | 8 | 6 | 6 | 7 | 6.8 |
| Visit steps (avg) | 7 | 7.5 | 5.5 | 6.3 | 6.3 | 6.5 |
| Visit success | 8 | 8 | 6 | 8 | 8 | 7.6 |
| Day | 8 | 7 | 6 | 7 | 7 | 7.0 |
| My Location | 7 | 6 | 5 | 6 | 5 | 5.8 |
| Notifications | 7 | 7 | 6 | 7 | 7 | 6.8 |
| Offline Sync | 8 | 8 | 7 | 7 | 9 | 7.8 |
| Profile | 7 | 7 | 6 | 6 | 6 | 6.4 |
| Settings | 6 | 7 | 6 | 7 | 5 | 6.2 |
| Diagnostics | 6 | 6 | 5 | 7 | 6 | 6.0 |
| Problems | 7 | 7 | 6 | 6 | 7 | 6.6 |

**Mean of primary wired screens ≈ 6.6 / 10** → maps to maturity **~68 / 100** after weighting visit/Today/Day higher.

---

## Final recommendation

| Option | Selected? |
|--------|-----------|
| Needs major redesign | No |
| **Good foundation, targeted improvements needed** | **Yes** |
| Ready for client demo with minor polish | After P0 only |
| Production-quality enterprise UX | No — requires P0+P1 |

The product already communicates “professional agriculture field tool.” Close the **touch, sunlight, sticky actions, and system consolidation** gaps before treating the UX as client- or production-ready.

---

*Audit complete. No application code was modified.*
