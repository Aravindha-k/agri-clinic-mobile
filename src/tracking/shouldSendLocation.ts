/** Minimum movement (meters) before sending a route point. */
export const ROUTE_MIN_MOVE_METERS = 50;

/** Minimum elapsed time (ms) before a speed-based send is allowed. */
export const ROUTE_MIN_INTERVAL_MS = 60_000;

/** Speed threshold (m/s) for time-based sends (~3.6 km/h). */
export const ROUTE_MIN_SPEED_MPS = 1;

/** Below this speed with small displacement = stationary GPS jitter. */
export const ROUTE_STATIONARY_SPEED_MPS = 0.5;

/** Ignore micro-movement when speed is near zero. */
export const ROUTE_JITTER_DISTANCE_METERS = 30;

/** Skip points worse than this unless it is the first point of the workday. */
export const ROUTE_MAX_ACCURACY_METERS = 100;

export type RoutePoint = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  timestamp: number;
};

export type SkipReason = "poor_accuracy" | "stationary_jitter" | "no_movement";

export type ShouldSendResult =
  | { send: true; distanceMeters: number }
  | { send: false; reason: SkipReason; distanceMeters: number };

/** Haversine distance in meters between two WGS84 coordinates. */
export function distanceMeters(
  a: Pick<RoutePoint, "latitude" | "longitude">,
  b: Pick<RoutePoint, "latitude" | "longitude">
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Decide whether a new GPS reading should be sent to the backend.
 * - First point (no previous): always send (even if accuracy is poor).
 * - Moved >= 50 m: send.
 * - >= 60 s elapsed AND speed > 1 m/s: send.
 * - Poor accuracy (> 100 m): skip (unless first point).
 * - Near-zero speed and < 30 m movement: skip (jitter).
 */
export function shouldSendLocation(
  previousPoint: RoutePoint | null,
  newPoint: RoutePoint,
  options?: { force?: boolean }
): ShouldSendResult {
  const distanceM = previousPoint
    ? distanceMeters(previousPoint, newPoint)
    : 0;

  if (options?.force || !previousPoint) {
    return { send: true, distanceMeters: distanceM };
  }

  const accuracy = newPoint.accuracy;
  if (accuracy != null && Number.isFinite(accuracy) && accuracy > ROUTE_MAX_ACCURACY_METERS) {
    return { send: false, reason: "poor_accuracy", distanceMeters: distanceM };
  }

  const speed = newPoint.speed;
  const elapsedMs = Math.max(0, newPoint.timestamp - previousPoint.timestamp);

  if (
    distanceM < ROUTE_JITTER_DISTANCE_METERS &&
    (speed == null || !Number.isFinite(speed) || Math.abs(speed) < ROUTE_STATIONARY_SPEED_MPS)
  ) {
    return { send: false, reason: "stationary_jitter", distanceMeters: distanceM };
  }

  if (distanceM >= ROUTE_MIN_MOVE_METERS) {
    return { send: true, distanceMeters: distanceM };
  }

  if (elapsedMs >= ROUTE_MIN_INTERVAL_MS && speed != null && Number.isFinite(speed) && speed > ROUTE_MIN_SPEED_MPS) {
    return { send: true, distanceMeters: distanceM };
  }

  return { send: false, reason: "no_movement", distanceMeters: distanceM };
}
