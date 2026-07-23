/** Shared GPS sampling / upload thresholds for field route tracking. */

export const ROUTE_MIN_MOVE_METERS = 40;
export const ROUTE_JITTER_DISTANCE_METERS = 30;
export const ROUTE_MAX_ACCURACY_METERS = 100;
export const ROUTE_MOVING_SPEED_MPS = 0.8;
export const ROUTE_STATIONARY_SPEED_MPS = 0.5;

/**
 * Admin Online/Stale/Offline contract (heartbeat-based):
 * Online ≤ 7 min, Stale ≤ 15 min, Offline > 15 min.
 * Mobile targets one heartbeat ≈ every 5 minutes while duty is active.
 */
export const TRACKING_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/** Native FGS wake interval — ~5 min so lock-screen / minimize keep admin Online. */
export const BACKGROUND_LOCATION_TIME_INTERVAL_MS = TRACKING_HEARTBEAT_INTERVAL_MS;

/** Foreground poll while the app is open (UI freshness; not the admin heartbeat). */
export const ROUTE_MOVING_INTERVAL_MS = 22_500;
export const ROUTE_STOPPED_INTERVAL_MS = 90_000;

/**
 * @deprecated Stationary keepalive must use tracking/heartbeat/, not duplicate location points.
 * Kept for callers that still reference the constant.
 */
export const ROUTE_STOPPED_KEEPALIVE_MS = TRACKING_HEARTBEAT_INTERVAL_MS;

export const BATTERY_SAVER_INTERVAL_MULTIPLIER = 1.5;
export const GPS_QUEUE_MAX_POINTS = 200;

let batterySaverEnabled = false;

export function setTrackingBatterySaverEnabled(enabled: boolean) {
  batterySaverEnabled = enabled;
}

export function isTrackingBatterySaverEnabled() {
  return batterySaverEnabled;
}

export function isLocationMoving(speed: number | null | undefined) {
  return speed != null && Number.isFinite(speed) && speed >= ROUTE_MOVING_SPEED_MPS;
}

function withBatterySaver(ms: number) {
  return batterySaverEnabled ? Math.round(ms * BATTERY_SAVER_INTERVAL_MULTIPLIER) : ms;
}

export function getBackgroundTimeIntervalMs() {
  // Cap at 5 min — battery saver must not push past Admin Online (≤7 min) window.
  return BACKGROUND_LOCATION_TIME_INTERVAL_MS;
}

export function getBackgroundDistanceIntervalMeters() {
  // FGS uses distanceInterval: 0 for time wakes; this remains for documentation/tests.
  return 0;
}

export function getForegroundPollIntervalMs(isMoving: boolean) {
  return withBatterySaver(isMoving ? ROUTE_MOVING_INTERVAL_MS : ROUTE_STOPPED_INTERVAL_MS);
}

export function getTrackingHeartbeatIntervalMs() {
  // Never stretch heartbeat past 5 min (Admin Online SLA).
  return TRACKING_HEARTBEAT_INTERVAL_MS;
}
