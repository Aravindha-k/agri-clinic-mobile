/**
 * Active-workday tracking-health + GPS blocking gate contracts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("canonical TrackingHealth model and thresholds", () => {
  const types = read("src/tracking/trackingHealthTypes.ts");
  const constants = read("src/constants/trackingHealth.ts");
  assert.match(types, /permission_required/);
  assert.match(types, /permission_permanently_denied/);
  assert.match(types, /services_disabled/);
  assert.match(types, /tracking_stopped/);
  assert.match(types, /location_stale/);
  assert.match(types, /isTrackingHealthBlocking/);
  assert.match(constants, /TRACKING_STALE_WARNING_MS/);
  assert.match(constants, /TRACKING_STALE_BLOCK_MS/);
  assert.match(constants, /ROUTE_STOPPED_INTERVAL_MS/);
  assert.match(constants, /Location is required while your workday is active/);
  assert.match(constants, /Turn on location to continue field tracking/);
});

test("TrackingHealthProvider owns probe + recover + session clear", () => {
  const src = read("src/storage/TrackingHealthContext.tsx");
  assert.match(src, /evaluateHealth/);
  assert.match(src, /ensureLocationReadyForAction/);
  assert.match(src, /startTrackingBridge/);
  assert.match(src, /sendTrackingHeartbeat/);
  assert.match(src, /session_replaced/);
  assert.match(src, /AppState/);
  assert.match(src, /recoverInFlightRef/);
  assert.match(src, /healthEquals|setHealthIfChanged/);
  assert.match(src, /refreshHealthRef/);
  // refreshHealth must not close over `health` state (Maximum update depth loop).
  assert.doesNotMatch(src, /}, \[foregroundTrackingActive, health, sessionReady, workdayActive\]/);
  assert.doesNotMatch(src, /requestBackgroundPermissionsAsync/);
  assert.doesNotMatch(src, /Linking\.openSettings\(\)/);
});

test("identical health updates are idempotent", () => {
  const src = read("src/storage/TrackingHealthContext.tsx");
  assert.match(src, /healthEquals\(prev, next\) \? prev : next/);
  assert.match(src, /lastLocationKeyRef/);
});

test("AppState recovery uses single-flight refs without remount loop", () => {
  const src = read("src/storage/TrackingHealthContext.tsx");
  assert.match(src, /recoverInFlightRef/);
  assert.match(src, /refreshHealthRef\.current/);
  assert.match(src, /recoverRef\.current/);
  // AppState effect must not list refreshHealth/recover in deps (callback churn).
  assert.match(
    src,
    /}, \[sessionReady, workdayActive\]\);/
  );
});

test("GpsWorkdayGate blocks field UI with recovery + logout", () => {
  const src = read("src/components/GpsWorkdayGate.tsx");
  assert.match(src, /useTrackingHealthOptional/);
  assert.match(src, /Modal/);
  assert.match(src, /Allow Location/);
  assert.match(src, /Turn On Location/);
  assert.match(src, /Resume Tracking/);
  assert.match(src, /Open Settings/);
  assert.match(src, /Check Again/);
  assert.match(src, /Log out/);
  assert.match(src, /openSettingsExplicit/);
  assert.match(src, /recover/);
});

test("AppProviders mount TrackingHealth inside TrackingProvider", () => {
  const src = read("AppProviders.tsx");
  assert.match(src, /TrackingHealthProvider/);
  const trackingIdx = src.indexOf("<TrackingProvider>");
  const healthIdx = src.indexOf("<TrackingHealthProvider>");
  const gateIdx = src.indexOf("<GpsWorkdayGate>");
  assert.ok(trackingIdx >= 0 && healthIdx > trackingIdx && gateIdx > healthIdx);
});

test("in-app outage notification is deduped and workday-scoped", () => {
  const src = read("src/components/NotificationBridge.tsx");
  const copy = read("src/constants/trackingHealth.ts");
  assert.match(src, /TRACKING_HEALTH_COPY/);
  assert.match(src, /isTrackingHealthBlocking/);
  assert.match(src, /lastOutage/);
  assert.match(copy, /Location tracking stopped/);
});

test("no automatic Settings in tracking health recover path", () => {
  const gate = read("src/components/GpsWorkdayGate.tsx");
  const health = read("src/storage/TrackingHealthContext.tsx");
  assert.doesNotMatch(gate, /Linking\.openSettings/);
  assert.match(health, /openSettingsForPendingStartWorkDay/);
  assert.doesNotMatch(health, /await Linking\.openSettings/);
});

test("foreground location only remains enforced", () => {
  const health = read("src/storage/TrackingHealthContext.tsx");
  assert.doesNotMatch(health, /requestBackgroundPermissionsAsync/);
  assert.match(health, /getForegroundPermissionsAsync/);
});

console.log("PASS tracking-health-gate");
