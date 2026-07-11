# Start Workday UX Report

## Previous experience

- Start Workday lived inside the glass `WorkdayHero` card, often below a tall Today greeting header.
- GPS readiness was not visible before tapping Start.
- Permission / GPS failures used a generic `requestGpsForFieldWork` modal with hardcoded English copy.
- Tracking context errors could exist without an on-screen banner on Today / Day.
- After a successful start, next actions were mixed into the wider Today dashboard (not a clear New Visit / Farmers / My Route set).

## New experience

Ideal flow on **Today** (mirrored on **Day**):

1. Open Today → solid **Start your workday** card above the greeting header.
2. See GPS readiness row (`Location ready`, permission / GPS off, checking, unable).
3. Tap **Start Workday** once → permission / services gate → existing `startDay()`.
4. Button shows **Starting workday…**, disabled to prevent double taps.
5. On success → **Workday active** card with start time, tracking line, distance / visits / pending sync.
6. Primary next action **New Visit**, then **Farmers** / **My Route**; stay on Today (no forced navigation).

## Files changed

| File | Change |
|------|--------|
| `mobile/components/workday/WorkdayStartPanel.tsx` | New idle / active workday panel |
| `src/utils/workdayLocationGate.ts` | Readiness probe + permission / GPS alerts (existing location utils) |
| `src/utils/workdayStartCopy.ts` | Shared i18n gate copy helper |
| `mobile/app/(tabs)/index.tsx` | Wire panel, gate, errors, next actions |
| `mobile/app/tracking.tsx` | Same panel / gate / busy / error UX |
| `src/components/WorkdayInactiveBanner.tsx` | Same gate + i18n Start CTA |
| `mobile/components/ui/PrimaryButton.tsx` | Keep label visible while loading |
| `src/i18n/en.ts` | `workdayUx.*` + updated start helper |
| `src/i18n/ta.ts` | Tamil `workdayUx.*` + helper |
| `START_WORKDAY_UX_REPORT.md` | This report |

**Not changed:** `TrackingContext.startDay()` / `endDay()`, GPS capture, sync queues, APIs, payloads.

## Permission states handled

| State | UI readiness | On Start tap |
|-------|--------------|--------------|
| Granted + services on | Location ready | Proceed to `startDay()` |
| Undetermined | Location permission required | Request via `ensureForegroundPermission`; Allow Location alert if still needed |
| Denied (can ask again) | Location permission required | Allow Location / Cancel |
| Permanently denied | Location permission required | Open Settings / Cancel |
| Checking | Checking location… | — |

## GPS states handled

| State | UI readiness | On Start tap |
|-------|--------------|--------------|
| Services off | Turn on device location | Open Location Settings / Cancel |
| Unavailable / probe fail | Unable to get location | Gate does not claim ready |
| Capture timeout / no fix | (after `startDay`) | Existing `startDay` GPS alert; button re-enabled |

## Navigation changes

- After start: remain on Today / Day.
- **New Visit** → `VisitFlow` / `NewVisitFarmer`.
- **Farmers** → Work queue.
- **My Route** → existing `MyLocation` (single user-facing route label).

## i18n changes

- New `workdayUx` namespace (EN + TA): start titles, readiness labels, gate alert bodies, active labels, next actions, error titles.
- Updated `home.startWorkdayBody` to the field-travel helper text.
- Inactive banner Start CTA uses `workdayUx.startWorkday` (no hardcoded “Start day”).

## Accessibility changes

- Start / next-action buttons: `accessibilityRole="button"`, labels, disabled + busy states.
- Readiness row: icon + text label (not color alone).
- Error banner: `accessibilityLiveRegion="polite"` with Retry / Cancel.
- Loading: button announces **Starting workday…** and busy state.

## TypeScript result

```text
npx tsc --noEmit
→ exit 0 (pass)
```

## Expo Doctor result

```text
npx expo-doctor
→ 17/18 checks passed
→ 1 failed (pre-existing): native android/ios folders + Prebuild fields in app.config.js
```

## Remaining risks

- `startDay()` still shows its own English alerts for some GPS / API failures; panel banner covers context `error` (mostly API / sync). Location timeout copy inside TrackingContext was intentionally left unchanged.
- `WorkdayHero` remains in the repo unused by Today/Day; can be removed in a later cleanup.
- Short devices: Start card is first, but Offline + Inactive banners can still add scroll before stats.
- Outdoor GPS timeouts still depend on device/environment; UI guides retry but cannot guarantee a fix.
