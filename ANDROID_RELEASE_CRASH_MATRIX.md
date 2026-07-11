# Android Release Crash Matrix

**Repository:** `d:\agri-clinic-mobile`  
**Audit baseline commit:** `c80d2d2`

## Logcat capture status

| Item | Status |
|------|--------|
| `adb` on audit machine | Not in PATH during automated audit |
| Physical device | Not attached during automated audit |
| Live stack traces | **Pending device retest** — see `scripts/capture-android-crash-log.md` |

Do not mark **Fixed** without before/after reproduction on device with logcat.

---

## Crash matrix

| ID | Screen/action | Device state | Result | Crash type | Stack trace summary | Root cause | Fix status |
|----|---------------|--------------|--------|------------|----------------------|------------|------------|
| CRASH-001 | Tap **Day** tab | Release APK | App closes | Suspected native/JS | Pending logcat | Missing error boundary; fragile tab Reanimated; broken root nav | Mitigated — SafeDayScreen, static tabs, rootNavigationRef |
| CRASH-002 | **Notifications** row tap | Logged in | Broken nav / crash | Static analysis | Pending logcat | `getParent()` undefined on root stack | Fixed — rootNavigationRef helpers |
| CRASH-003 | **Start Workday** | Permission denied | Opens Settings | UX exit | N/A | Auto Settings intents | Mitigated — in-app permission only |
| CRASH-004 | GPS background probe | Active workday | Settings alert | UX exit | N/A | Immediate compliance reminder | Fixed — banner-only (c80d2d2) |
| CRASH-005 | Splash animation | Release APK | No zoom | Animation | N/A | Babel/Reanimated + subtle scale | Mitigated — babel + zoom loop |
| CRASH-006 | Map preview (Day) | Bad GPS | Suspected native | Pending logcat | Malformed polyline coords | Mitigated — filterMapCoordinates |
| CRASH-007 | Visit success actions | Post submit | Stuck modal | Navigation | N/A | getParent navigate | Fixed — rootNavigationRef |
| CRASH-008 | FAB (+) press | GPS error | Unhandled async | JS | Pending logcat | Missing try/catch | Fixed — VisitFabTabButton |
