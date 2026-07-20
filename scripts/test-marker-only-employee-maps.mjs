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
const markers = read("src/features/duty/map/employeeDayMapMarkers.ts");

assert.match(markers, /kind: "route_start"/, "Start marker builder");
assert.match(markers, /kind: "visit"/, "Visit markers builder");
assert.match(markers, /kind: "route_end"/, "End marker builder");
assert.match(dutyMap, /buildEmployeeDayMapMarkers/, "DutyMapCard uses canonical builder");
assert.match(dutyMap, /route=\{\[\]\}/, "DutyMapCard never passes GPS trail");
assert.doesNotMatch(dutyMap, /sampleRouteForFit/, "camera must not fit breadcrumbs");
assert.doesNotMatch(dutyMap, /route=\{dutyMap/, "no routePoints on employee map");
assert.doesNotMatch(dutyMap, /readPendingVisits/, "no draft/pending visit markers on Day map");
assert.doesNotMatch(dutyMap, /current-live/, "no live pin markers on Day map");

assert.match(daySummary, /route=\{\[\]\}/, "DaySummary preview marker-only");
assert.doesNotMatch(daySummary, /route=\{dutyMap\?\.routePoints\}/, "no breadcrumb preview");

assert.match(myLocScreen, /route=\{\[\]\}/, "My Location marker-only");
assert.match(myLocScreen, /showsUserLocation=\{isActive && locationGranted\}/, "native live only while active");
assert.match(myLocHook, /buildEmployeeDayMapMarkers/, "My Location uses canonical markers");
assert.match(myLocHook, /workdayEnded: workdayFinished/, "End only after finish");
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
