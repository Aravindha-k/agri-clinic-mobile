/**
 * Heartbeat-backed professional field tracking — regression checks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("root cause fix: empty location batch still heartbeats", () => {
  const task = read("src/tracking/registerBackgroundLocationTask.ts");
  assert.match(task, /processBackgroundLocations\(Array\.isArray\(locations\) \? locations : \[\]\)/);
  assert.doesNotMatch(task, /if \(locations\?\.length\)/);
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /emitTrackingHeartbeat/);
  assert.match(sync, /!locations\.length/);
});

test("FGS wakes are time-based (distanceInterval 0) for stationary Online", () => {
  const svc = read("src/tracking/backgroundLocationService.ts");
  assert.match(svc, /distanceInterval:\s*0/);
  assert.match(svc, /deferredUpdatesInterval:\s*0/);
  assert.match(svc, /timeInterval:\s*getBackgroundTimeIntervalMs\(\)/);
  assert.match(svc, /Accuracy\.Balanced/);
});

test("heartbeat contract fields for Admin Online", () => {
  const report = read("src/utils/gpsStateReport.ts");
  for (const field of [
    "duty_session_id",
    "gps_enabled",
    "permission_granted",
    "tracking_service_active",
    "app_state",
    "network_available",
    "client_heartbeat_id",
    "recorded_at"
  ]) {
    assert.match(report, new RegExp(field));
  }
  const hb = read("src/tracking/heartbeatService.ts");
  assert.match(hb, /client_heartbeat_id/);
  assert.match(hb, /app_state/);
  assert.match(hb, /network_available/);
  assert.match(hb, /enqueueHeartbeat/);
  assert.match(hb, /flushHeartbeatQueue/);
  assert.match(hb, /generateLocalHeartbeatId/);
});

test("offline heartbeat queue + reconnect flush", () => {
  const hb = read("src/tracking/heartbeatService.ts");
  assert.match(hb, /pendingHeartbeats/);
  assert.match(hb, /queued/);
  const storage = read("mobile/lib/storage.ts");
  assert.match(storage, /pendingHeartbeats/);
  const sync = read("mobile/lib/sync/offlineSyncManager.ts");
  assert.match(sync, /flushHeartbeatQueue/);
  const clear = read("src/storage/clearLocalFieldQueues.ts");
  assert.match(clear, /clearHeartbeatQueue/);
  assert.match(clear, /pendingHeartbeats/);
});

test("heartbeat interval capped at 5 minutes (Online SLA)", () => {
  const cfg = read("src/tracking/trackingConfig.ts");
  assert.match(cfg, /TRACKING_HEARTBEAT_INTERVAL_MS = 5 \* 60 \* 1000/);
  assert.match(cfg, /getTrackingHeartbeatIntervalMs[\s\S]*return TRACKING_HEARTBEAT_INTERVAL_MS/s);
  assert.match(cfg, /getBackgroundTimeIntervalMs[\s\S]*return BACKGROUND_LOCATION_TIME_INTERVAL_MS/s);
});

test("single FGS instance + duty-only", () => {
  const svc = read("src/tracking/backgroundLocationService.ts");
  assert.match(svc, /canStartBackgroundWatcher/);
  assert.match(svc, /No active duty session/);
  assert.match(svc, /alreadyRunning/);
  const gps = read("mobile/lib/gps/trackingService.ts");
  assert.match(gps, /if \(serviceRunning\) return/);
});

test("bootstrap offline restore restarts tracking", () => {
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /toOfflineDutySnapshot\(cached\)/);
  assert.match(duty, /snapshot\.currentDuty\?\.is_active/);
  assert.match(duty, /startTrackingBridge/);
});

test("permission revoked still emits heartbeat; logout clears queues", () => {
  const ctx = read("src/storage/TrackingContext.tsx");
  assert.match(ctx, /foreground_missing/);
  assert.match(ctx, /emitTrackingHeartbeat\(\{ gpsEnabledHint: false \}\)/);
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /clearLocalFieldQueuesOnSessionReplace/);
  assert.match(auth, /stopTrackingBridge/);
});

test("GPS movement still filtered; no duplicate client_point_id generator per point", () => {
  const should = read("src/tracking/shouldSendLocation.ts");
  assert.match(should, /ROUTE_MIN_MOVE_METERS/);
  assert.match(should, /stationary_jitter/);
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /generateLocalPointId/);
  assert.match(sync, /client_point_id/);
});

test("AppState resume flushes GPS + heartbeat and recovers force fix", () => {
  const ctx = read("src/storage/TrackingContext.tsx");
  assert.match(ctx, /tracking_resume/);
  assert.match(ctx, /flushHeartbeatQueue/);
  assert.match(ctx, /force:\s*true/);
  assert.match(ctx, /startBackgroundLocationTracking/);
});
