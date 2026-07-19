import type * as Location from "expo-location";
import {
  pushLocation,
  pushLocationsBulk,
  type GpsBulkSyncResult,
  type LocationPushPayload
} from "../api/tracking";
import {
  acknowledgeLocationPushPoints,
  appendLocationPush,
  hydrateLocationPushDeviceSession,
  pendingPointToPayload,
  readLocationPushQueue
} from "../storage/locationPushQueue";
import {
  clearLastSentRoutePoint,
  getLastSentRoutePoint,
  setLastSentRoutePoint
} from "../storage/lastSentRouteStorage";
import { getActiveDutySessionId, getActiveWorkdayId } from "../storage/workdaySessionStorage";
import { toTrackingPayload } from "../utils/location";
import { isDutySessionMismatchMessage, isWorkdayInactiveMessage } from "../utils/workdayStatus";
import { shouldSendLocation, type RoutePoint } from "./shouldSendLocation";
import { trackingDevLog } from "./trackingDevLog";
import { getBatteryPercent } from "../../mobile/lib/gps/trackingService";
import { isDutyTrackingSessionActive, restoreDutySessionFromStorage } from "./trackingSession";
import { notifyRouteSynced } from "../utils/routeSyncBus";
import { refreshSyncStoreCounts } from "../../mobile/lib/sync/offlineSyncManager";
import { applyGpsBulkAcknowledgement } from "../../mobile/lib/sync/gpsBulkAck";
import { generateLocalPointId } from "../../mobile/lib/sync/queueIds";
import { readActiveUserGpsQueue, replaceActiveUserGpsQueue } from "../../mobile/lib/sync/gpsQueueStore";
import { assertTrackingAuthReady } from "./trackingAuthGate";
import { clearCachedActiveWorkday } from "../storage/workdaySessionStorage";

export type LocationHandleResult = "sent" | "skipped" | "queued";

let locationUploadInFlight = false;
let locationHandleInFlight = false;
/** Single-flight resume flush so AppState + sync + home don't triple-upload. */
let resumeFlushPromise: Promise<number> | null = null;

function scheduleBackgroundGpsFlush() {
  void import("../../mobile/lib/sync/offlineSyncManager").then(({ autoFlushPendingGps }) => {
    void autoFlushPendingGps();
  });
}

async function stopTrackingAfterDutyEnded(reason: string): Promise<void> {
  trackingDevLog("tracking_stopped", reason);
  await clearCachedActiveWorkday().catch(() => undefined);
  const { stopTrackingBridge } = await import("../storage/TrackingContext");
  await stopTrackingBridge().catch(() => undefined);
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
  const clientPointId = generateLocalPointId();
  return {
    ...toTrackingPayload(
      location,
      {
        workdayId: workdayId ?? undefined,
        dutySessionId: dutySessionId ?? undefined
      },
      batteryLevel,
      clientPointId
    ),
    client_point_id: clientPointId,
    gps_enabled: gpsState.gps_enabled,
    location_permission_status: gpsState.location_permission_status,
    background_tracking_enabled: gpsState.background_tracking_enabled
  };
}

function applyBulkAckToStore(ack: GpsBulkSyncResult, sentPointIds: string[]): number {
  const owned = readActiveUserGpsQueue();
  const { remaining, removedCount } = applyGpsBulkAcknowledgement(owned, ack, sentPointIds);
  replaceActiveUserGpsQueue(remaining);
  return removedCount;
}

async function flushSinglePoint(point: LocationPushPayload): Promise<number> {
  await pushLocation(point);
  const pointId = point.client_point_id;
  if (pointId) {
    return acknowledgeLocationPushPoints([pointId]);
  }
  return 1;
}

/** Try live upload; queue locally on failure. */
export async function syncLocationPoint(payload: LocationPushPayload): Promise<void> {
  const gate = await assertTrackingAuthReady("syncLocationPoint");
  if (!gate.ready) {
    await appendLocationPush(payload);
    refreshSyncStoreCounts();
    return;
  }

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
      const message = err instanceof Error ? err.message : "upload failed";
      if (message.startsWith("TRACKING_DEFERRED_AUTH:")) {
        await appendLocationPush(payload);
        refreshSyncStoreCounts();
        trackingDevLog("tracking_deferred_auth_not_ready", message);
        return;
      }
      if (isDutySessionMismatchMessage(message) || isWorkdayInactiveMessage(message)) {
        trackingDevLog(
          isDutySessionMismatchMessage(message) ? "duty_session_mismatch" : "skipped_reason",
          message
        );
        await stopTrackingAfterDutyEnded(
          isWorkdayInactiveMessage(message) ? "workday_inactive_or_expired" : "duty_session_mismatch"
        );
        return;
      } else {
        await appendLocationPush(payload);
        refreshSyncStoreCounts();
        scheduleBackgroundGpsFlush();
        trackingDevLog("queued_offline", message);
      }
      throw err;
    }
  } finally {
    locationUploadInFlight = false;
  }
}

/** Flush MMKV offline queue — used on reconnect / app foreground. Single-flight. */
export async function flushOfflineLocationQueue(): Promise<number> {
  if (resumeFlushPromise) {
    return resumeFlushPromise;
  }

  resumeFlushPromise = (async () => {
    const gate = await assertTrackingAuthReady("flushOfflineLocationQueue");
    if (!gate.ready) {
      return 0;
    }

    await hydrateLocationPushDeviceSession();
    const rawQueue = await readLocationPushQueue();
    if (!rawQueue.length || locationUploadInFlight) {
      return 0;
    }

    const activeDutyId = await getActiveDutySessionId();
    const queue = rawQueue.map((point) => ({
      ...point,
      duty_session_id: activeDutyId ?? point.duty_session_id
    }));
    const sentPointIds = queue
      .map((point) => point.client_point_id)
      .filter((id): id is string => Boolean(id));

    locationUploadInFlight = true;
    try {
      let removed = 0;
      if (queue.length === 1) {
        removed = await flushSinglePoint(queue[0]);
      } else {
        try {
          const ack = await pushLocationsBulk(queue);
          removed = applyBulkAckToStore(ack, sentPointIds);
          if (removed === 0 && ack.success_count > 0 && sentPointIds.length > 0) {
            removed = await acknowledgeLocationPushPoints(sentPointIds.slice(0, ack.success_count));
          }
        } catch (bulkErr) {
          const bulkMessage = bulkErr instanceof Error ? bulkErr.message : "";
          if (isDutySessionMismatchMessage(bulkMessage) || isWorkdayInactiveMessage(bulkMessage)) {
            trackingDevLog("duty_session_mismatch", bulkMessage);
            await stopTrackingAfterDutyEnded("flush_duty_inactive");
            throw bulkErr;
          }
          for (const point of queue) {
            try {
              removed += await flushSinglePoint(point);
            } catch {
              /* retain point in queue */
            }
          }
        }
      }

      const remaining = readActiveUserGpsQueue();
      const lastAcked = queue.find((p) => p.client_point_id && !remaining.some(
        (r) => r.local_point_id === p.client_point_id
      ));
      if (lastAcked) {
        await setLastSentRoutePoint(payloadToRoutePoint(lastAcked));
      }
      refreshSyncStoreCounts();
      if (removed > 0) {
        notifyRouteSynced();
      }
      trackingDevLog("tracking_queue_flush", `removed=${removed} remaining=${remaining.length}`);
      trackingDevLog("offline_flush", `removed=${removed} remaining=${remaining.length}`);
      return removed;
    } catch (err) {
      const message = err instanceof Error ? err.message : "flush failed";
      trackingDevLog("offline_flush_failed", message);
      return 0;
    } finally {
      locationUploadInFlight = false;
    }
  })().finally(() => {
    resumeFlushPromise = null;
  });

  return resumeFlushPromise;
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

export { pendingPointToPayload };
