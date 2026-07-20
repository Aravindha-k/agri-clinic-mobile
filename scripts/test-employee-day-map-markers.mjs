/**
 * Strict employee Day map markers + daily cache isolation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("employee day markers: Start once, submitted visits, End only when ended", () => {
  const src = read("src/features/duty/map/employeeDayMapMarkers.ts");
  assert.match(src, /id: "route-start"/);
  assert.match(src, /kind: "visit"/);
  assert.match(src, /id: "route-end"/);
  assert.match(src, /workdayEnded && dutyMap\.endMarker/);
  assert.match(src, /marker\.pending !== true/);
  assert.match(src, /seenVisitKeys/);
  assert.match(src, /day-map:/);
  assert.doesNotMatch(src, /kind: "current"/);
  assert.match(src, /routePoints: \[\]/);
});

test("DutyMapCard is marker-only: no polyline, pending, or live pins", () => {
  const src = read("mobile/components/duty/DutyMapCard.tsx");
  assert.match(src, /buildEmployeeDayMapMarkers/);
  assert.match(src, /route=\{\[\]\}/);
  assert.match(src, /showsUserLocation=\{false\}/);
  assert.match(src, /followsUserLocation=\{false\}/);
  assert.match(src, /cameraFitKey/);
  assert.match(src, /stableFitSignature/);
  assert.doesNotMatch(src, /readPendingVisits/);
  assert.doesNotMatch(src, /current-live/);
  assert.doesNotMatch(src, /route=\{dutyMap/);
  assert.doesNotMatch(src, /sampleRouteForFit/);
});

test("day map cache identity is user + date + session", () => {
  const src = read("src/features/duty/storage/dayMapCacheStorage.ts");
  const markers = read("src/features/duty/map/employeeDayMapMarkers.ts");
  assert.match(src, /dayMapCacheIdentity/);
  assert.match(src, /agri_day_map_v1:/);
  assert.match(src, /toEmployeeDutyMapPresentation/);
  assert.match(markers, /day-map:/);
});

test("DutyContext writes scoped day map and strips trail points", () => {
  const src = read("src/features/duty/store/DutyContext.tsx");
  assert.match(src, /writeScopedDayMap/);
  assert.match(src, /toEmployeeDutyMapPresentation/);
  assert.match(src, /resolveDutyWorkDate/);
});

test("DaySummary and My Location use canonical marker builder", () => {
  assert.match(read("mobile/components/daySummary/DaySummaryRouteCard.tsx"), /buildEmployeeDayMapMarkers/);
  assert.match(read("src/hooks/useMyLocationScreen.ts"), /buildEmployeeDayMapMarkers/);
  assert.match(read("src/hooks/useMyLocationScreen.ts"), /workdayEnded: workdayFinished/);
});

test("API bounds still exclude routePoints from employee framing", () => {
  const api = read("src/features/duty/api/dutyMapApi.ts");
  assert.match(api, /Employee map framing — markers only/);
  assert.doesNotMatch(api, /\.\.\.routePoints,\s*\n\s*\.\.\.visitMarkers/);
});

console.log("PASS employee-day-map-markers");
