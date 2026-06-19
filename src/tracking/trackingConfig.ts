/** Shared GPS sampling / upload thresholds for field route tracking. */

export const ROUTE_MIN_MOVE_METERS = 40;
export const ROUTE_JITTER_DISTANCE_METERS = 30;
export const ROUTE_MAX_ACCURACY_METERS = 100;
export const ROUTE_MOVING_SPEED_MPS = 0.8;
export const ROUTE_STATIONARY_SPEED_MPS = 0.5;

/** Target 15–30 s while moving. */
export const ROUTE_MOVING_INTERVAL_MS = 22_500;

/** Target 60–120 s while stopped. */
export const ROUTE_STOPPED_INTERVAL_MS = 90_000;
export const ROUTE_STOPPED_KEEPALIVE_MS = 120_000;

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
  return withBatterySaver(ROUTE_MOVING_INTERVAL_MS);
}

export function getBackgroundDistanceIntervalMeters() {
  return ROUTE_MIN_MOVE_METERS;
}

export function getForegroundPollIntervalMs(isMoving: boolean) {
  return withBatterySaver(isMoving ? ROUTE_MOVING_INTERVAL_MS : ROUTE_STOPPED_INTERVAL_MS);
}
