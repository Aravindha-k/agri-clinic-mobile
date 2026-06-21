import type * as Location from "expo-location";
import { pushLocation, pushLocationsBulk, type LocationPushPayload } from "../api/tracking";
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
import { getActiveDutySessionId, getActiveWorkdayId } from "../storage/workdaySessionStorage";
import { toTrackingPayload } from "../utils/location";
import { shouldSendLocation, type RoutePoint } from "./shouldSendLocation";
import { trackingDevLog } from "./trackingDevLog";
import { getBatteryPercent } from "../../mobile/lib/gps/trackingService";
import { isDutyTrackingSessionActive, restoreDutySessionFromStorage } from "./trackingSession";
import { notifyRouteSynced } from "../utils/routeSyncBus";
import { refreshSyncStoreCounts } from "../../mobile/lib/sync/offlineSyncManager";

export type LocationHandleResult = "sent" | "skipped" | "queued";

let locationUploadInFlight = false;
let locationHandleInFlight = false;

function scheduleBackgroundGpsFlush() {
  void import("../../mobile/lib/sync/offlineSyncManager").then(({ autoFlushPendingGps }) => {
    void autoFlushPendingGps();
  });
}

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

async function buildPayload(
  location: Location.LocationObject,
  options?: { gpsEnabledHint?: boolean }
): Promise<LocationPushPayload> {
  const { getGpsStateReport } = await import("../utils/gpsStateReport");
  const [workdayId, dutySessionId, batteryLevel, gpsState] = await Promise.all([
    getActiveWorkdayId(),
    getActiveDutySessionId(),
    getBatteryPercent(),
    getGpsStateReport(options)
  ]);
  return {
    ...toTrackingPayload(
      location,
      {
        workdayId: workdayId ?? undefined,
        dutySessionId: dutySessionId ?? undefined
      },
      batteryLevel
    ),
    gps_enabled: gpsState.gps_enabled,
    location_permission_status: gpsState.location_permission_status,
    background_tracking_enabled: gpsState.background_tracking_enabled
  };
}

/** Try live upload; queue locally on failure. */
export async function syncLocationPoint(payload: LocationPushPayload): Promise<void> {
  if (locationUploadInFlight) {
    await appendLocationPush(payload);
    return;
  }

  locationUploadInFlight = true;
  try {
    try {
      await pushLocation(payload);
      await setLastSentRoutePoint(payloadToRoutePoint(payload));
      refreshSyncStoreCounts();
      notifyRouteSynced();
      trackingDevLog(
        "sent_to_backend",
        `${payload.latitude},${payload.longitude} @ ${payload.captured_at}`
      );
    } catch (err) {
      await appendLocationPush(payload);
      refreshSyncStoreCounts();
      scheduleBackgroundGpsFlush();
      trackingDevLog(
        "queued_offline",
        err instanceof Error ? err.message : "upload failed"
      );
      throw err;
    }
  } finally {
    locationUploadInFlight = false;
  }
}

/** Flush MMKV offline queue — used on reconnect / app foreground. */
export async function flushOfflineLocationQueue(): Promise<number> {
  const queue = await readLocationPushQueue();
  if (!queue.length || locationUploadInFlight) {
    return 0;
  }

  locationUploadInFlight = true;
  try {
    if (queue.length === 1) {
      await pushLocation(queue[0]);
    } else {
      try {
        await pushLocationsBulk(queue);
      } catch {
        for (const point of queue) {
          await pushLocation(point);
        }
      }
    }
    await clearLocationPushQueue();
    const last = queue[queue.length - 1];
    await setLastSentRoutePoint(payloadToRoutePoint(last));
    refreshSyncStoreCounts();
    notifyRouteSynced();
    trackingDevLog("offline_flush", `synced=${queue.length}`);
    return queue.length;
  } catch (err) {
    trackingDevLog(
      "offline_flush_failed",
      err instanceof Error ? err.message : "flush failed"
    );
    return 0;
  } finally {
    locationUploadInFlight = false;
  }
}

/**
 * Apply movement rules and send/queue a location update.
 * Use `force: true` for the first point when duty starts.
 */
export async function handleLocationUpdate(
  location: Location.LocationObject,
  options?: { force?: boolean }
): Promise<LocationHandleResult> {
  const dutyActive =
    options?.force || isDutyTrackingSessionActive() || (await restoreDutySessionFromStorage());
  if (!dutyActive) {
    return "skipped";
  }

  if (locationHandleInFlight) {
    trackingDevLog("skipped_reason", "concurrent_update");
    return "skipped";
  }

  locationHandleInFlight = true;
  try {
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
      const payload = await buildPayload(location);
      await syncLocationPoint(payload);
      return "sent";
    } catch {
      return "queued";
    }
  } finally {
    locationHandleInFlight = false;
  }
}

export async function handleForcedLocationUpdate(
  location: Location.LocationObject
): Promise<LocationHandleResult> {
  return handleLocationUpdate(location, { force: true });
}

/** Process GPS batch from native background task — must await so data persists before OS suspends JS. */
export async function processBackgroundLocations(locations: Location.LocationObject[]): Promise<void> {
  const dutyActive = await restoreDutySessionFromStorage();
  if (!dutyActive) {
    trackingDevLog("skipped_reason", "no_duty_in_background_task");
    return;
  }

  for (const location of locations) {
    try {
      await handleLocationUpdate(location);
    } catch (err) {
      trackingDevLog(
        "task_error",
        err instanceof Error ? err.message : "background location failed"
      );
    }
  }
}

export async function resetRouteTrackingState(): Promise<void> {
  await clearLastSentRoutePoint();
}
