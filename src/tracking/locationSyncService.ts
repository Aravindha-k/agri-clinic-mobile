import type * as Location from "expo-location";
import { syncLocationQueue, type LocationPushPayload } from "../api/tracking";
import {
  appendLocationPush,
  clearLocationPushQueue,
  readLocationPushQueue
} from "../storage/locationPushQueue";
import {
  clearLastSentRoutePoint,
  getLastSentRoutePoint,
  setLastSentRoutePoint
} from "../storage/lastSentRouteStorage";
import { getActiveWorkdayId } from "../storage/workdaySessionStorage";
import { toTrackingPayload } from "../utils/location";
import { shouldSendLocation, type RoutePoint } from "./shouldSendLocation";
import { trackingDevLog } from "./trackingDevLog";

export type LocationHandleResult = "sent" | "skipped" | "queued";

function locationToRoutePoint(location: Location.LocationObject): RoutePoint {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? null,
    speed: location.coords.speed ?? null,
    timestamp: location.timestamp
  };
}

function payloadToRoutePoint(payload: LocationPushPayload): RoutePoint {
  const ts = Date.parse(payload.captured_at);
  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy ?? null,
    speed: payload.speed ?? null,
    timestamp: Number.isFinite(ts) ? ts : Date.now()
  };
}

export async function syncLocationPoint(payload: LocationPushPayload): Promise<void> {
  await appendLocationPush(payload);
  const queue = await readLocationPushQueue();
  trackingDevLog("queued_location_count", String(queue.length));
  try {
    await syncLocationQueue(queue);
    await clearLocationPushQueue();
    await setLastSentRoutePoint(payloadToRoutePoint(payload));
    trackingDevLog(
      "sent_to_backend",
      `${payload.latitude},${payload.longitude} @ ${payload.captured_at}`
    );
  } catch (err) {
    const remaining = await readLocationPushQueue();
    trackingDevLog(
      "queued_offline",
      err instanceof Error ? err.message : `queued=${remaining.length}`
    );
    throw err;
  }
}

/**
 * Apply movement rules and send/queue a location update.
 * Use `force: true` for the first point when workday starts.
 */
export async function handleLocationUpdate(
  location: Location.LocationObject,
  options?: { force?: boolean }
): Promise<LocationHandleResult> {
  const workdayId = await getActiveWorkdayId();
  const routePoint = locationToRoutePoint(location);
  const previous = await getLastSentRoutePoint();

  trackingDevLog(
    "location_received",
    `${routePoint.latitude.toFixed(6)},${routePoint.longitude.toFixed(6)} acc=${routePoint.accuracy ?? "?"}m`
  );

  const decision = shouldSendLocation(previous, routePoint, options);
  trackingDevLog("distance_from_previous", `${decision.distanceMeters.toFixed(1)}m`);

  if (!decision.send) {
    trackingDevLog("skipped_reason", decision.reason);
    return "skipped";
  }

  try {
    const payload = toTrackingPayload(location, workdayId ?? undefined);
    await syncLocationPoint(payload);
    return "sent";
  } catch {
    return "queued";
  }
}

export async function handleForcedLocationUpdate(location: Location.LocationObject): Promise<LocationHandleResult> {
  return handleLocationUpdate(location, { force: true });
}

export async function processBackgroundLocations(locations: Location.LocationObject[]): Promise<void> {
  for (const location of locations) {
    await handleLocationUpdate(location);
  }
}

export async function resetRouteTrackingState(): Promise<void> {
  await clearLastSentRoutePoint();
}
