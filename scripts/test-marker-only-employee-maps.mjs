/**
 * Employee Day / Tracking maps are marker-only — no GPS breadcrumb polylines.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const dutyMap = read("mobile/components/duty/DutyMapCard.tsx");
const daySummary = read("mobile/components/daySummary/DaySummaryRouteCard.tsx");
const myLocHook = read("src/hooks/useMyLocationScreen.ts");
const myLocScreen = read("src/screens/map/MyLocationScreen.tsx");
const dutyMapApi = read("src/features/duty/api/dutyMapApi.ts");
const tracking = read("src/storage/TrackingContext.tsx");
const gpsService = read("mobile/lib/gps/trackingService.ts");

assert.match(dutyMap, /kind: "route_start"/, "Start marker");
assert.match(dutyMap, /kind: "visit"/, "Visit markers");
assert.match(dutyMap, /kind: "route_end"/, "End marker");
assert.match(dutyMap, /dutyActive/, "live gated on active workday");
assert.match(dutyMap, /showNativeLive|showCustomLive/, "optional live while active");
assert.match(dutyMap, /route=\{\[\]\}/, "DutyMapCard never passes GPS trail");
assert.doesNotMatch(dutyMap, /sampleRouteForFit/, "camera must not fit breadcrumbs");
assert.doesNotMatch(dutyMap, /route=\{dutyMap/, "no routePoints on employee map");

assert.match(daySummary, /route=\{\[\]\}/, "DaySummary preview marker-only");
assert.doesNotMatch(daySummary, /route=\{dutyMap\?\.routePoints\}/, "no breadcrumb preview");

assert.match(myLocScreen, /route=\{\[\]\}/, "My Location marker-only");
assert.match(myLocScreen, /showsUserLocation=\{isActive && locationGranted\}/, "native live only while active");
assert.match(myLocHook, /workdayFinished && dutyMap\?\.endMarker/, "End only after finish");
assert.doesNotMatch(myLocHook, /dutyMap\?\.bounds/, "do not fit via GPS-inflated bounds");

assert.match(dutyMapApi, /routePoints/, "GPS history still parsed for admin payload");
assert.match(
  dutyMapApi,
  /Employee map framing — markers only/,
  "fallback bounds exclude routePoints"
);
assert.doesNotMatch(
  dutyMapApi,
  /\.\.\.routePoints,\s*\n\s*\.\.\.visitMarkers/,
  "routePoints must not inflate employee bounds"
);

// GPS collection still present in tracking stack
assert.match(tracking, /handleLocationUpdate|startGpsTrackingService|BACKGROUND_LOCATION/, "tracking collection intact");
assert.match(gpsService, /startGpsTrackingService|flushGpsBuffer/, "GPS upload path intact");

console.log("PASS marker-only-employee-maps");
