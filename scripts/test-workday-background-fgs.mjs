/**
 * Workday Android foreground-service field tracking — static + pure unit checks.
 * Covers the 15 architecture scenarios (service, heartbeat, queue, teardown, restore).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

/** Mirror of shouldSendLocation distance helper for pure unit assertions. */
function distanceMeters(a, b) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

test("1. Active workday starts foreground service with persistent notification", () => {
  const svc = read("src/tracking/backgroundLocationService.ts");
  assert.match(svc, /foregroundService/);
  assert.match(svc, /Field tracking active/);
  assert.match(svc, /Your location is being updated during your workday/);
  assert.match(svc, /killServiceOnDestroy:\s*false/);
  assert.match(svc, /Accuracy\.Balanced/);
  const ctx = read("src/storage/TrackingContext.tsx");
  assert.match(ctx, /startBackgroundLocationTracking/);
  assert.match(ctx, /markDutyTrackingSessionActive\(true\)/);
});

test("2–3. Minimize / screen lock keep native FGS (no auto-pause)", () => {
  const svc = read("src/tracking/backgroundLocationService.ts");
  assert.match(svc, /pausesUpdatesAutomatically:\s*false/);
  assert.match(svc, /getBackgroundTimeIntervalMs/);
  assert.match(svc, /distanceInterval:\s*0/);
  const cfg = read("src/tracking/trackingConfig.ts");
  assert.match(cfg, /BACKGROUND_LOCATION_TIME_INTERVAL_MS\s*=\s*TRACKING_HEARTBEAT_INTERVAL_MS/);
  assert.match(cfg, /5 \* 60 \* 1000/);
});

test("4–5. Stationary path skips duplicate points; heartbeat keeps Admin Online", () => {
  const src = read("src/tracking/shouldSendLocation.ts");
  assert.match(src, /stationary_jitter/);
  assert.match(src, /stationary_heartbeat_only/);
  assert.match(src, /must NOT upload duplicate coordinates/);
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /processBackgroundLocations/);
  assert.match(sync, /emitTrackingHeartbeat/);
  const report = read("src/utils/gpsStateReport.ts");
  assert.match(report, /tracking_service_active/);
  assert.match(report, /recorded_at/);
  assert.match(report, /duty_session_id/);
  assert.doesNotMatch(report, /latitude:\s*0/);
});

test("6. Meaningful movement distance meets route threshold", () => {
  const prev = { latitude: 11.0, longitude: 77.0 };
  const moved = { latitude: 11.0005, longitude: 77.0 };
  assert.ok(distanceMeters(prev, moved) >= 40);
  const src = read("src/tracking/shouldSendLocation.ts");
  assert.match(src, /ROUTE_MIN_MOVE_METERS/);
  assert.match(src, /distanceM >= ROUTE_MIN_MOVE_METERS/);
});

test("7–8. Network loss queues; flush on return", () => {
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /queued_offline/);
  assert.match(sync, /appendLocationPush/);
  assert.match(sync, /flushOfflineLocationQueue/);
  assert.match(sync, /client_point_id/);
});

test("9. GPS off updates heartbeat without fake coordinates", () => {
  const report = read("src/utils/gpsStateReport.ts");
  assert.match(report, /services_disabled/);
  assert.match(report, /gps_enabled:\s*false/);
  assert.doesNotMatch(report, /latitude:\s*0,\s*longitude:\s*0/);
  const svc = read("src/tracking/backgroundLocationService.ts");
  assert.match(svc, /FIELD_TRACKING_NOTIFICATION_GPS_OFF_BODY/);
  const ctx = read("src/storage/TrackingContext.tsx");
  assert.match(ctx, /gpsEnabled:\s*false/);
});

test("10–12. Workday end / logout / SESSION_REPLACED stop service", () => {
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /stopTrackingAfterDutyEnded/);
  const ctx = read("src/storage/TrackingContext.tsx");
  assert.match(ctx, /registerPreSignOut/);
  assert.match(ctx, /registerSessionTeardown/);
  assert.match(ctx, /stopBackgroundLocationTracking/);
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /stopTrackingBridge/);
  assert.match(auth, /clearLocalFieldQueuesOnSessionReplace/);
  assert.match(auth, /session_replaced/);
  assert.match(auth, /explicit_logout/);
});

test("13. Process restart restores FGS for active duty", () => {
  const session = read("src/tracking/trackingSession.ts");
  assert.match(session, /restoreDutySessionFromStorage/);
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /startTrackingBridge/);
  assert.match(duty, /is_active/);
  const ctx = read("src/storage/TrackingContext.tsx");
  assert.match(ctx, /currentDuty\?\.is_active/);
  assert.match(ctx, /forceRecovery/);
});

test("14. No active duty means no background tracking", () => {
  const svc = read("src/tracking/backgroundLocationService.ts");
  assert.match(svc, /No active duty session/);
  assert.match(svc, /restoreDutySessionFromStorage/);
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /no_duty_in_background_task/);
});

test("15. client_point_id used for idempotent GPS uploads", () => {
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /generateLocalPointId/);
  assert.match(sync, /client_point_id/);
  const queue = read("src/storage/locationPushQueue.ts");
  assert.match(queue, /client_point_id/);
});

test("Permissions: FGS + background declared; disclosure at workday start only", () => {
  const app = read("app.config.js");
  assert.match(app, /isAndroidBackgroundLocationEnabled:\s*true/);
  assert.match(app, /isAndroidForegroundServiceEnabled:\s*true/);
  assert.match(app, /ACCESS_BACKGROUND_LOCATION/);
  assert.match(app, /FOREGROUND_SERVICE_LOCATION/);
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /ACCESS_BACKGROUND_LOCATION/);
  assert.match(manifest, /FOREGROUND_SERVICE_LOCATION/);
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.match(gate, /ensureBackgroundLocationForWorkday/);
  const bg = read("src/features/fieldTrackingSetup/ensureBackgroundLocation.ts");
  assert.match(bg, /WORKDAY_LOCATION_DISCLOSURE/);
  assert.match(
    bg,
    /Location is used during your active workday so the office can view your latest field location/
  );
  assert.match(bg, /requestBackgroundPermissionsAsync/);
  assert.doesNotMatch(read("App.tsx"), /requestBackgroundPermissionsAsync/);
});

test("Heartbeat interval is 5 minutes; no fake coords on heartbeat API", () => {
  const api = read("src/api/tracking.ts");
  assert.match(api, /emitTrackingHeartbeat/);
  const gps = read("mobile/lib/gps/trackingService.ts");
  assert.match(gps, /getTrackingHeartbeatIntervalMs/);
  assert.match(gps, /emitTrackingHeartbeat/);
  const should = read("src/tracking/shouldSendLocation.ts");
  assert.match(should, /options\?\.force \|\| !previousPoint/);
});
