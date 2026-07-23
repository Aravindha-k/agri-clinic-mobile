import * as Battery from "expo-battery";
import * as SecureStore from "expo-secure-store";
import type { LocationPushPayload } from "../../../src/api/tracking";
import {
  pushLocationsBulk,
  syncLocationQueue
} from "../../../src/api/tracking";
import {
  appendGpsQueuePoint,
  countActiveUserPendingGps,
  discardAllGpsQueuePoints,
  ensureGpsPointIdentity,
  migrateGpsQueueRecords,
  readActiveUserGpsQueue,
  readFullGpsQueue,
  writeFullGpsQueue
} from "../sync/gpsQueueStore";
import type { PendingGPSPoint } from "../sync/fieldQueueTypes";
import { getActiveSyncUserId } from "../sync/queueOwnership";
import { refreshSyncStoreCounts } from "../sync/offlineSyncManager";
import { payloadToPendingPoint, pendingPointToPayload } from "../../../src/storage/locationPushQueue";
import { storage } from "../storage";
import { GPS_QUEUE_MAX_POINTS, getTrackingHeartbeatIntervalMs } from "../../../src/tracking/trackingConfig";

const LEGACY_QUEUE_KEY = "agri_pending_location_push_v2";

export const PENDING_GPS_KEY = "pending_gps_v1";
export const LAST_GPS_SYNC_KEY = "last_gps_sync_v1";
export const MAX_GPS_BUFFER = GPS_QUEUE_MAX_POINTS;
export const GPS_FLUSH_THRESHOLD = 1;
export const GPS_FLUSH_INTERVAL_MS = 45_000;
export const GPS_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

export type GpsBufferPoint = LocationPushPayload & {
  battery_level?: number | null;
};

export type GpsBufferStatus = {
  pending: number;
  max: number;
  percent: number;
  lastSyncAt: string | null;
};

let flushTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let serviceRunning = false;
let gpsEnabledProbe: (() => boolean) | null = null;

export function toPendingPoint(payload: GpsBufferPoint): PendingGPSPoint {
  return payloadToPendingPoint(payload);
}

export function readPendingGpsBuffer(): GpsBufferPoint[] {
  return readActiveUserGpsQueue().map(pendingPointToPayload);
}

async function readLegacySecureQueue(): Promise<GpsBufferPoint[]> {
  try {
    const raw = await SecureStore.getItemAsync(LEGACY_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GpsBufferPoint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function migrateLegacyGpsQueueIfNeeded() {
  const current = readFullGpsQueue();
  if (current.length) return;
  const legacy = await readLegacySecureQueue();
  if (!legacy.length) return;
  for (const point of legacy) {
    appendGpsQueuePoint(toPendingPoint(point));
  }
  await SecureStore.deleteItemAsync(LEGACY_QUEUE_KEY).catch(() => undefined);
}

export async function appendPendingGpsPoint(payload: GpsBufferPoint) {
  await migrateLegacyGpsQueueIfNeeded();
  appendGpsQueuePoint(toPendingPoint(payload));
}

/** @deprecated Use discardAllGpsQueuePoints for explicit admin discard only. */
export function clearPendingGpsBuffer() {
  discardAllGpsQueuePoints();
  refreshSyncStoreCounts();
}

export function getGpsBufferStatus(): GpsBufferStatus {
  const pending = countActiveUserPendingGps();
  const lastSyncAt = storage.getString(LAST_GPS_SYNC_KEY) ?? null;
  return {
    pending,
    max: MAX_GPS_BUFFER,
    percent: Math.min(100, Math.round((pending / MAX_GPS_BUFFER) * 100)),
    lastSyncAt
  };
}

export async function flushGpsBuffer(): Promise<{ synced: number }> {
  await migrateLegacyGpsQueueIfNeeded();
  const { flushGPSQueue } = await import("../sync/offlineSyncManager");
  return flushGPSQueue();
}

export async function flushVisitGpsQueue() {
  return flushGpsBuffer();
}

export function getLastBufferedPointTime(): string | null {
  const points = readActiveUserGpsQueue();
  const last = points[points.length - 1];
  return last?.recorded_at ?? null;
}

export async function sendTrackingHeartbeat() {
  const gpsEnabled = gpsEnabledProbe?.() ?? true;
  const { emitTrackingHeartbeat } = await import("../../../src/tracking/heartbeatService");
  await emitTrackingHeartbeat({ gpsEnabledHint: gpsEnabled });
}

export function startGpsTrackingService(options?: { isGpsEnabled?: () => boolean }) {
  if (serviceRunning) return;
  serviceRunning = true;
  gpsEnabledProbe = options?.isGpsEnabled ?? null;

  void migrateLegacyGpsQueueIfNeeded();
  void flushGpsBuffer().catch(() => undefined);
  // Immediate heartbeat so Admin flips Online without waiting for the first interval.
  void sendTrackingHeartbeat().catch(() => undefined);

  flushTimer = setInterval(() => {
    void flushGpsBuffer().catch(() => undefined);
  }, GPS_FLUSH_INTERVAL_MS);

  const heartbeatMs = getTrackingHeartbeatIntervalMs();
  heartbeatTimer = setInterval(() => {
    void sendTrackingHeartbeat().catch(() => undefined);
  }, heartbeatMs);
}

export function stopGpsTrackingService() {
  serviceRunning = false;
  gpsEnabledProbe = null;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export async function getBatteryPercent(): Promise<number | null> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (!Number.isFinite(level) || level < 0) {
      return null;
    }
    return Math.round(level * 100);
  } catch {
    return null;
  }
}

export function toGpsBufferPoint(
  payload: LocationPushPayload,
  batteryLevel?: number | null
): GpsBufferPoint {
  return {
    ...payload,
    battery_level: batteryLevel ?? null
  };
}

export async function pushBufferedLocations(points: GpsBufferPoint[]) {
  if (!points.length) return;
  if (points.length === 1) {
    await syncLocationQueue(points);
    return;
  }
  await pushLocationsBulk(points);
}

export { migrateGpsQueueRecords, ensureGpsPointIdentity };
