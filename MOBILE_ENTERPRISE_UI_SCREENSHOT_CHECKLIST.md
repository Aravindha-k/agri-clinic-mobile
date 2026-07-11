# Mobile Enterprise UI — Screenshot Checklist

**Purpose:** Capture evidence on a **real Android device** before limited client QA.  
**Status:** Not captured yet — checklist only.  
**App:** Kavya Agri Clinic field app (`d:\agri-clinic-mobile`)

Capture in **English** and **Tamil** where marked. Prefer a mid-range Android phone (≈360–412dp width) plus one small device if available.

---

## How to capture

1. Use a release or preview APK (not Expo Go for map/GPS-critical shots when possible).
2. Fill the full screen; hide notification shade.
3. Note build/version in Profile before starting.
4. Store files as `EN_<id>.png` / `TA_<id>.png`.

---

## Checklist

| ID | Screenshot | Required app state | Expected visual result | Defects to watch for |
|----|------------|--------------------|------------------------|----------------------|
| 01 | Login | Logged out; empty fields | Clean card, PrimaryButton CTA, 48dp eye toggle | Overlap with hero; clipped footer; soft CTA |
| 02 | Login validation | Submit empty / wrong password | Inline error box; fields still usable | Keyboard covering error; truncated Tamil error |
| 03 | Today — before Start | Workday inactive | Start workday above fold; readable header; bell visible | Start below fold; glass unreadable outdoors; duplicate Start |
| 04 | Today — during workday | Workday active | Timer + stats; **End workday** visible | Missing End; Start still shown; overlapping stats |
| 05 | End Workday confirmation | Tap End on Today or Day | Confirm dialog (title/body/Cancel/End) | No dialog; wrong copy; English-only on Tamil locale |
| 06 | End Workday after confirm | Confirm End | UI returns to inactive / Start state | Stuck “active”; false success after failure |
| 07 | Farmer list | Work tab loaded | Cards with priority StatusChip; 48dp actions | Crowded actions; chip colliding with name |
| 08 | Farmer search | Non-empty search query | Filtered list stable | Layout jump; empty with leftover cards |
| 09 | Farmer card — long name | Farmer with long EN/TA name | Name primary; wraps/ellipsis without covering chip | Horizontal scroll; chip clipped |
| 10 | Farmer detail | Open any farmer | Grouped info; large actions | Overlap; cut-off Visit button |
| 11 | Visit step 1 | Start visit | VisitFlowHeader + GPS pill; farmer picker | Tiny back; broken segments |
| 12 | Visit step 2 | Crop/problem selected | Shared header; sticky Continue when valid | Continue enabled without crop/problem |
| 13 | Visit step 3 | Observation/photos | Header; photo add/remove | Tiny remove hit area; keyboard covering Continue |
| 14 | Visit step 4 | Review ready | Change chips ≥48dp; human-readable problem chip | Change overflow; raw category codes |
| 15 | Visit GPS error / weak GPS | Weak or denied GPS on capture | Clear GPS status / messaging | Silent failure; false “captured” |
| 16 | Visit photo state | ≥1 photo attached | Count/preview readable | Broken thumbnails; remove inaccessible |
| 17 | Visit success | After successful submit | Success confirmation | Premature success; stuck spinner |
| 18 | Day — with route | Active day + distance/visits | Hero + KPIs + route card | Duplicate End; empty KPIs when data exists |
| 19 | Day — without route | Idle / zero distance | Idle copy understandable | Blank map tease; confusing empty |
| 20 | Map markers | My Location with GPS | Distinct you/visit markers; usable refresh | FAB covering content; wrong subtitle |
| 21 | Map Live alias | Open via Live Map route if reachable | Subtitle = live tracking copy | Same as Travel with no distinction |
| 22 | Map Travel alias | Open via Travel History if reachable | Subtitle clarifies distance/history intent | Duplicate unmarked screens |
| 23 | Profile | Me tab | H1 title; lang pills; logout distinct | Title dominating; tiny pills |
| 24 | Language selection | Switch EN ↔ TA | Selected state obvious; labels update | Partial translation; clipped தமிழ் |
| 25 | Diagnostics | Expand API/diagnostics on Profile or login error | Readable output | Overflow; unreadable monospace |
| 26 | Offline banner | Force offline / airplane | Banner visible; actions still clear | Banner covering CTA; no indication |
| 27 | API error | Kill API / bad base URL | Friendly error; retry path | Crash; blank screen |
| 28 | Empty state | Empty farmers or notifications | Shared EmptyState pattern | Inconsistent empty; tiny action |
| 29 | Tamil — Today | Language = TA, workday idle + active | Labels fit; no cut Tamil | Mid-word wrap; overlapping EN leftovers |
| 30 | Tamil — Visit review | TA + long crop/problem | Chips truncate gracefully | Horizontal scroll; unreadable chips |
| 31 | Large font ≈130% | System font scale ~1.3 | Buttons still tappable; no clip | Fixed-height clipping; cut CTAs |
| 32 | Large font ≈150% | System font scale ~1.5 | Layout remains usable | Broken hero; unusable farmer actions |

---

## Sign-off

| Role | Name | Date | Device / OS | Build |
|------|------|------|-------------|-------|
| Captured by | | | | |
| Reviewed by | | | | |

**Capture complete:** ☐ No ☐ Partial ☐ Yes (all required IDs)

Until this checklist is marked complete with attached images, **limited client QA readiness cannot be claimed**.
