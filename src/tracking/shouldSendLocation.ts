import {
  ROUTE_JITTER_DISTANCE_METERS,
  ROUTE_MIN_MOVE_METERS,
  ROUTE_MOVING_INTERVAL_MS,
  ROUTE_STATIONARY_SPEED_MPS,
  ROUTE_STOPPED_INTERVAL_MS,
  ROUTE_STOPPED_KEEPALIVE_MS,
  isLocationMoving
} from "./trackingConfig";

export type RoutePoint = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  timestamp: number;
};

export type SkipReason = "stationary_jitter" | "no_movement";

export type ShouldSendResult =
  | { send: true; distanceMeters: number; heartbeat?: boolean }
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
 * Decide whether a GPS reading should be uploaded.
 * Poor accuracy is still sent (accuracy included in payload).
 * Heartbeat allowed when stopped >= 120 s without 30–50 m move.
 */
export function shouldSendLocation(
  previousPoint: RoutePoint | null,
  newPoint: RoutePoint,
  options?: { force?: boolean; heartbeat?: boolean }
): ShouldSendResult {
  const distanceM = previousPoint ? distanceMeters(previousPoint, newPoint) : 0;

  if (options?.force || options?.heartbeat || !previousPoint) {
    return { send: true, distanceMeters: distanceM, heartbeat: options?.heartbeat };
  }

  const speed = newPoint.speed;
  const elapsedMs = Math.max(0, newPoint.timestamp - previousPoint.timestamp);
  const moving = isLocationMoving(speed);

  if (
    distanceM < ROUTE_JITTER_DISTANCE_METERS &&
    (speed == null || !Number.isFinite(speed) || Math.abs(speed) < ROUTE_STATIONARY_SPEED_MPS)
  ) {
    if (!moving && elapsedMs >= ROUTE_STOPPED_KEEPALIVE_MS) {
      return { send: true, distanceMeters: distanceM, heartbeat: true };
    }
    return { send: false, reason: "stationary_jitter", distanceMeters: distanceM };
  }

  if (distanceM >= ROUTE_MIN_MOVE_METERS) {
    return { send: true, distanceMeters: distanceM };
  }

  if (moving && elapsedMs >= ROUTE_MOVING_INTERVAL_MS && distanceM >= ROUTE_JITTER_DISTANCE_METERS) {
    return { send: true, distanceMeters: distanceM };
  }

  if (!moving && elapsedMs >= ROUTE_STOPPED_INTERVAL_MS && distanceM >= ROUTE_JITTER_DISTANCE_METERS) {
    return { send: true, distanceMeters: distanceM };
  }

  if (!moving && elapsedMs >= ROUTE_STOPPED_KEEPALIVE_MS) {
    return { send: true, distanceMeters: distanceM, heartbeat: true };
  }

  return { send: false, reason: "no_movement", distanceMeters: distanceM };
}
