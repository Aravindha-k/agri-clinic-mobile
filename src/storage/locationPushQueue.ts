import type { LocationPushPayload } from "../api/tracking";
import {
  appendGpsQueuePoint,
  discardAllGpsQueuePoints,
  ensureGpsPointIdentity,
  migrateGpsQueueRecords,
  readActiveUserGpsQueue,
  readFullGpsQueue,
  removeAcknowledgedGpsPoints,
  replaceActiveUserGpsQueue,
  writeFullGpsQueue
} from "./gpsQueueStore";
import type { PendingGPSPoint } from "./fieldQueueTypes";
import { getActiveSyncUserId } from "./queueOwnership";
import { getDeviceSessionId } from "./deviceSessionStorage";

export async function readLocationPushQueue(): Promise<LocationPushPayload[]> {
  return readActiveUserGpsQueue().map(pendingPointToPayload);
}

export async function writeLocationPushQueue(items: LocationPushPayload[]) {
  const points = items.map(payloadToPendingPoint);
  replaceActiveUserGpsQueue(points);
}

export async function appendLocationPush(payload: LocationPushPayload) {
  appendGpsQueuePoint(payloadToPendingPoint(payload));
}

export async function enqueueLocationPush(payload: LocationPushPayload) {
  await appendLocationPush(payload);
}

export async function acknowledgeLocationPushPoints(acceptedIds: string[]): Promise<number> {
  return removeAcknowledgedGpsPoints(acceptedIds);
}

/** @deprecated Use acknowledgeLocationPushPoints. Only for explicit admin discard flows. */
export async function clearLocationPushQueue() {
  discardAllGpsQueuePoints();
}

export function pendingPointToPayload(point: PendingGPSPoint): LocationPushPayload {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy,
    speed: point.speed ?? undefined,
    heading: point.heading ?? undefined,
    battery_level: point.battery_level,
    duty_session_id: point.duty_session_id,
    workday_id: point.server_workday_id ?? point.duty_session_id,
    captured_at: point.recorded_at,
    recorded_at: point.recorded_at,
    client_point_id: point.local_point_id
  };
}

export function payloadToPendingPoint(payload: LocationPushPayload): PendingGPSPoint {
  const userId = getActiveSyncUserId() ?? undefined;
  return ensureGpsPointIdentity({
    local_point_id: payload.client_point_id,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy ?? 0,
    speed: payload.speed ?? null,
    heading: payload.heading ?? null,
    battery_level: payload.battery_level ?? 0,
    duty_session_id: payload.duty_session_id ?? payload.workday_id,
    server_workday_id: payload.workday_id ?? payload.duty_session_id,
    recorded_at: payload.recorded_at || payload.captured_at || new Date().toISOString(),
    network_type: "unknown",
    user_id: userId,
    sync_status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString()
  });
}

export async function hydrateLocationPushDeviceSession(): Promise<void> {
  const sessionId = await getDeviceSessionId();
  if (!sessionId) return;
  const all = readFullGpsQueue();
  const userId = getActiveSyncUserId();
  if (userId == null) return;
  let changed = false;
  const next = all.map((point: PendingGPSPoint) => {
    if (point.user_id === userId && !point.device_session_id) {
      changed = true;
      return { ...point, device_session_id: sessionId, updated_at: new Date().toISOString() };
    }
    return point;
  });
  if (changed) {
    writeFullGpsQueue(next);
  }
}

export { migrateGpsQueueRecords, replaceActiveUserGpsQueue };
