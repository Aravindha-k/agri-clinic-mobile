import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Day map renders markers without movement polyline or user location", () => {
  const screen = read("src/screens/map/MyLocationScreen.tsx");
  assert.doesNotMatch(screen, /\broute=\{/);
  assert.match(screen, /showsUserLocation=\{false\}/);
  assert.match(screen, /followsUserLocation=\{false\}/);
});

test("Day card loads fresh paginated markers and exposes button semantics", () => {
  const card = read("mobile/components/daySummary/DaySummaryRouteCard.tsx");
  const cache = read("src/utils/visitsCache.ts");
  assert.match(card, /fetchVisitsForMapMarkers\(\{\s*pageSize:\s*100,\s*maxPages:\s*10/);
  assert.match(card, /accessibilityRole="button"/);
  assert.match(card, /accessibilityLabel=/);
  assert.match(cache, /export async function fetchVisitsForMapMarkers/);
  assert.match(cache, /for \(let pageIndex = 0; pageIndex < maxPages; pageIndex \+= 1\)/);
  assert.match(cache, /nextUrl\s*\?\s*\{\s*nextUrl\s*\}/);
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
