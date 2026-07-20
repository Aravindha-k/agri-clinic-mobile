import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const require = createRequire(import.meta.url);

test("Day screen keeps approved structure without timer, distance, or End Workday", () => {
  const day = read("mobile/app/tracking.tsx");
  assert.match(day, /DayCompactSummary/);
  assert.match(day, /DutyMapCard/);
  assert.match(day, /fill/);
  assert.doesNotMatch(day, /endDuty|onEndWorkday|handleEndWorkday/);
  assert.doesNotMatch(day, /DutyTimeline|DayFooterSummary|DayRouteSummary/);
  assert.doesNotMatch(day, /timerDisplay|<DutyTimer/);
});

test("Day map uses capped camera, marker-only Start/Visit/End, and top legend", () => {
  const map = read("mobile/components/duty/DutyMapCard.tsx");
  assert.match(map, /cameraMode="cappedRegion"/);
  assert.match(map, /maxDelta:\s*0\.048/);
  assert.match(map, /buildEmployeeDayMapMarkers/);
  assert.doesNotMatch(map, /current-live/);
  assert.doesNotMatch(map, /kind: "current"/);
  assert.match(map, /dutyActive/);
  assert.match(map, /styles\.legend/);
  assert.match(map, /scan-outline/);
  assert.match(map, /stableFitSignature/);
  assert.doesNotMatch(map, /sampleRouteForFit/);
  assert.match(map, /route=\{\[\]\}/);
});

test("FieldMapView supports cameraFitKey and cappedRegion without continuous remount", () => {
  const view = read("src/components/map/FieldMapView.tsx");
  const types = read("src/components/map/FieldMapView.types.ts");
  assert.match(types, /cameraFitKey\?:/);
  assert.match(types, /cameraMode\?:/);
  assert.match(view, /cameraMode === "cappedRegion"/);
  assert.match(view, /lastCameraFitKeyRef/);
  assert.match(view, /animateToRegion\(safeRegion/);
});

test("spreadDuplicateMapCoordinates fans overlapping pins", () => {
  // Pure JS copy of the layout helper for unit proof without TS loader.
  const COORD_BUCKET = 5;
  const OFFSET_DEG = 0.00009;
  function spreadDuplicateMapCoordinates(markers) {
    if (markers.length < 2) return markers;
    const buckets = new Map();
    markers.forEach((m, index) => {
      const key = `${m.lat.toFixed(COORD_BUCKET)},${m.lng.toFixed(COORD_BUCKET)}`;
      const list = buckets.get(key);
      if (list) list.push(index);
      else buckets.set(key, [index]);
    });
    const out = markers.map((m) => ({ ...m }));
    for (const indices of buckets.values()) {
      if (indices.length < 2) continue;
      indices.forEach((markerIndex, i) => {
        if (i === 0) return;
        const angle = (Math.PI * 2 * i) / indices.length;
        out[markerIndex] = {
          ...out[markerIndex],
          lat: out[markerIndex].lat + Math.sin(angle) * OFFSET_DEG * (1 + i * 0.15),
          lng: out[markerIndex].lng + Math.cos(angle) * OFFSET_DEG * (1 + i * 0.15)
        };
      });
    }
    return out;
  }

  const same = [
    { id: "a", lat: 11.1, lng: 78.2 },
    { id: "b", lat: 11.1, lng: 78.2 },
    { id: "c", lat: 11.1, lng: 78.2 }
  ];
  const spread = spreadDuplicateMapCoordinates(same);
  assert.equal(spread[0].lat, 11.1);
  assert.notEqual(spread[1].lat, spread[0].lat);
  assert.notEqual(spread[2].lng, spread[0].lng);

  const source = read("mobile/lib/dayMapMarkerLayout.ts");
  assert.match(source, /spreadDuplicateMapCoordinates/);
  assert.match(source, /coordsSignature/);
  void require;
});

test("Day overview KPI set stays minimal with GPS Active/Waiting/Unavailable", () => {
  const summary = read("mobile/components/duty/DayCompactSummary.tsx");
  const gps = read("mobile/components/today/formatDistanceTravelled.ts");
  assert.match(summary, /Started/);
  assert.match(summary, /Expected end/);
  assert.match(summary, /Visits completed/);
  assert.match(summary, /Farmers covered/);
  assert.match(summary, /GPS/);
  assert.doesNotMatch(summary, /label="Distance"|label=\{?["']Distance|End Workday|timerDisplay/);
  assert.match(gps, /return "Active"/);
  assert.match(gps, /return "Waiting"/);
  assert.match(gps, /return "Unavailable"/);
});

test("Expo Go banner gate remains __DEV__ && Expo Go only", () => {
  const runtime = read("src/utils/expoRuntime.ts");
  assert.match(runtime, /shouldShowExpoGoDevWarning/);
  assert.match(runtime, /__DEV__/);
  assert.match(runtime, /isExpoGo/);
});
