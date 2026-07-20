import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Day map renders markers without movement polyline and never follows the camera", () => {
  const screen = read("src/screens/map/MyLocationScreen.tsx");
  // Explicit empty route — no movement/breadcrumb polyline coordinates.
  assert.match(screen, /route=\{\[\]\}/);
  assert.doesNotMatch(screen, /<\s*Polyline\b/);
  // Camera must not chase the user (start + visit dots stay framed).
  assert.match(screen, /followsUserLocation=\{false\}/);
  // Current location / granted gate only when duty is active and permission granted.
  assert.match(screen, /showsUserLocation=\{isActive && locationGranted\}/);
  assert.match(screen, /locationGranted=\{isActive && locationGranted\}/);
});

test("Day card renders only canonical duty-map data and exposes button semantics", () => {
  const card = read("mobile/components/daySummary/DaySummaryRouteCard.tsx");
  assert.match(card, /const \{ currentDuty, dutyMap \} = useDuty\(\);/);
  assert.doesNotMatch(card, /fetchVisitsForMapMarkers/);
  assert.doesNotMatch(card, /readPendingVisits/);
  assert.doesNotMatch(card, /readPendingGpsBuffer/);
  assert.match(card, /accessibilityRole="button"/);
  assert.match(card, /accessibilityLabel=/);
  assert.match(card, /DEFAULT_MAP_REGION/);
  assert.match(card, /fitCoordinates\.length \? fitCoordinates : undefined/);
});

test("Day start prefers explicit server coordinates and only then local queue", () => {
  const source = read("src/utils/dayRouteMap.ts");
  const serverCheck = source.indexOf("const server = toCoord(input.serverStart?.latitude");
  const localCheck = source.indexOf("const local = (input.pendingPoints ?? [])");
  assert.ok(serverCheck >= 0);
  assert.ok(localCheck > serverCheck);
  assert.doesNotMatch(
    source.slice(source.indexOf("export function extractWorkdayStartPoint"), source.indexOf("export function buildDayRouteMarkers")),
    /serverPoints/
  );
});

test("GPS payload keeps workday and duty identifiers distinct", () => {
  const api = read("src/api/tracking.ts");
  assert.match(api, /duty_session_id: location\.duty_session_id,/);
  assert.match(api, /workday_id: location\.workday_id,/);
  assert.doesNotMatch(api, /duty_session_id: location\.duty_session_id \?\? location\.workday_id/);
  assert.doesNotMatch(api, /workday_id: location\.workday_id \?\? location\.duty_session_id/);
});

test("map coordinate gate rejects zero coordinates", () => {
  const source = read("src/utils/mapCoords.ts");
  assert.match(source, /if \(la === 0 \|\| lo === 0\) return false;/);
});
