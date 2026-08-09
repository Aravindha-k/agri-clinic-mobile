/**
 * Start Work Day GPS confirmation — static regression checks.
 * Ensures start coords are sent on duty/start and immediately confirmed via location/update.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("duty start POST body includes latitude/longitude", () => {
  const src = read("src/api/tracking.ts");
  assert.match(src, /export async function startDutySession/);
  assert.match(
    src,
    /body:\s*JSON\.stringify\(\{\s*latitude:\s*coords\.latitude,\s*longitude:\s*coords\.longitude/s
  );
  assert.match(src, /DUTY_TRACKING_ROUTES\.start/);
});

test("canonical start route is tracking/duty/start/", () => {
  const src = read("src/api/dutyTrackingApi.ts");
  assert.match(src, /start:\s*["']tracking\/duty\/start\/["']/);
  assert.match(src, /locationUpdate:\s*["']tracking\/location\/update\/["']/);
});

test("startDuty captures GPS and confirms via location update without blocking UI unlock", () => {
  const src = read("src/features/duty/store/DutyContext.tsx");
  assert.match(src, /captureDutyActionLocation/);
  assert.match(src, /startDutySession\(\{\s*latitude:\s*coords\.latitude/s);
  assert.match(src, /confirmDutyStartLocationOrRetry\(confirmLocation,\s*started\)/);
  // Post-start confirm/bridge/map must be fire-and-forget so OEM GPS cannot freeze Start Work Day.
  assert.match(src, /void \(async \(\) => \{[\s\S]*confirmDutyStartLocationOrRetry[\s\S]*startTrackingBridge[\s\S]*refreshDutyMap[\s\S]*\}\)\(\)/);
  assert.match(src, /return started;/);
  assert.doesNotMatch(
    src,
    /await confirmDutyStartLocationOrRetry\(locationResult\.location,\s*started\);\s*await startTrackingBridge/
  );

  const startBlock = src.match(
    /const startDuty = useCallback\(async \(\) => \{[\s\S]*?\}, \[applyDutyState/
  );
  assert.ok(startBlock, "startDuty callback not found");
  const body = startBlock[0];
  const startIdx = body.indexOf("startDutySession");
  const applyIdx = body.indexOf("applyDutyState(started");
  const confirmIdx = body.indexOf("confirmDutyStartLocationOrRetry");
  const returnIdx = body.indexOf("return started;");
  assert.ok(startIdx >= 0 && applyIdx > startIdx, "applyDutyState after startDutySession");
  assert.ok(confirmIdx > applyIdx, "confirm must run after applyDutyState");
  assert.ok(returnIdx > applyIdx, "must return started after applyDutyState");
  // return started must not wait for awaited confirm+bridge chain
  assert.ok(
    body.indexOf("void (async () => {") > applyIdx &&
      body.indexOf("void (async () => {") < returnIdx,
    "post-start work must be fire-and-forget before return"
  );
  assert.equal(
    body.split("startDutySession").length - 1,
    1,
    "startDutySession must be called only once in startDuty"
  );
});

test("tracking bridge GPS fix is timed out; start does not await pollOnce", () => {
  const src = read("src/storage/TrackingContext.tsx");
  assert.match(src, /CURRENT_FIX_TIMEOUT_MS/);
  assert.match(src, /Promise\.race\(/);
  assert.match(src, /getCurrentPositionAsync/);
  assert.match(src, /getLastKnownPositionAsync/);
  assert.match(src, /setBusy\(false\);/);
  assert.match(src, /void pollOnce\(\);/);
  assert.doesNotMatch(src, /await pollOnce\(\);/);
});

test("tracking health grants start grace instead of immediate tracking_stopped block", () => {
  const src = read("src/storage/TrackingHealthContext.tsx");
  assert.match(src, /TRACKING_START_GRACE_MS/);
  assert.match(src, /workdayActiveForMs/);
  assert.match(src, /status:\s*"recovering"/);
});

test("confirmDutyStartLocation forces upload linked to returned session", () => {
  const src = read("src/tracking/locationSyncService.ts");
  assert.match(src, /export async function confirmDutyStartLocation/);
  assert.match(src, /confirmDutyStartLocationOrRetry/);
  assert.match(src, /scheduleDutyStartGpsConfirmRetry/);
  assert.match(src, /force:\s*true/);
  assert.match(src, /duty_session_id/);
  assert.match(src, /markDutyTrackingSessionActive\(true\)/);
  assert.match(src, /syncLocationPoint/);
});

test("GPS sync queues offline without retrying duty start", () => {
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /queued_offline/);
  assert.match(sync, /appendLocationPush/);
  assert.doesNotMatch(sync, /startDutySession/);
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /runSingleFlightAction/);
  assert.match(duty, /isWorkdayAlreadyActiveMessage/);
});
