import * as Battery from "expo-battery";
import * as SecureStore from "expo-secure-store";
import type { LocationPushPayload } from "../../../src/api/tracking";
import { pushLocationsBulk, sendTrackingHeartbeat as postTrackingHeartbeat, syncLocationQueue } from "../../../src/api/tracking";
import {
  addGPSPoint,
  flushGPSQueue,
  refreshSyncStoreCounts,
  type PendingGPSPoint
} from "../sync/offlineSyncManager";
import { getJson, setJson, storage } from "../storage";
import { GPS_QUEUE_MAX_POINTS } from "../../../src/tracking/trackingConfig";

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

function readRaw(): PendingGPSPoint[] {
  return getJson<PendingGPSPoint[]>(PENDING_GPS_KEY, []);
}

function pendingToGpsBufferPoint(point: PendingGPSPoint): GpsBufferPoint {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy,
    speed: point.speed ?? undefined,
    heading: point.heading ?? undefined,
    captured_at: point.recorded_at,
    recorded_at: point.recorded_at,
    battery_level: point.battery_level,
    duty_session_id: point.duty_session_id,
    workday_id: point.duty_session_id
  };
}

export function toPendingPoint(payload: GpsBufferPoint): PendingGPSPoint {
  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy ?? 0,
    speed: payload.speed ?? null,
    heading: payload.heading ?? null,
    battery_level: payload.battery_level ?? 0,
    duty_session_id: payload.duty_session_id ?? payload.workday_id,
    recorded_at: payload.recorded_at || payload.captured_at || new Date().toISOString(),
    network_type: (payload as { network_type?: string }).network_type || "unknown"
  };
}

export function readPendingGpsBuffer(): GpsBufferPoint[] {
  return readRaw().map(pendingToGpsBufferPoint);
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
  const current = readRaw();
  if (current.length) return;
  const legacy = await readLegacySecureQueue();
  if (!legacy.length) return;
  for (const point of legacy) {
    addGPSPoint(toPendingPoint(point));
  }
  await SecureStore.deleteItemAsync(LEGACY_QUEUE_KEY).catch(() => undefined);
}

export async function appendPendingGpsPoint(payload: GpsBufferPoint) {
  await migrateLegacyGpsQueueIfNeeded();
  addGPSPoint(toPendingPoint(payload));
}

export function clearPendingGpsBuffer() {
  setJson(PENDING_GPS_KEY, []);
  refreshSyncStoreCounts();
}

export function getGpsBufferStatus(): GpsBufferStatus {
  const pending = readRaw().length;
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
  return flushGPSQueue();
}

/** Direct bulk flush (used by UI sync button). */
export async function flushVisitGpsQueue() {
  return flushGpsBuffer();
}

export function getLastBufferedPointTime(): string | null {
  const points = readRaw();
  const last = points[points.length - 1];
  return last?.recorded_at ?? null;
}

export async function sendTrackingHeartbeat() {
  const gpsEnabled = gpsEnabledProbe?.() ?? true;
  await postTrackingHeartbeat({ gpsEnabledHint: gpsEnabled });
}

export function startGpsTrackingService(options?: { isGpsEnabled?: () => boolean }) {
  if (serviceRunning) return;
  serviceRunning = true;
  gpsEnabledProbe = options?.isGpsEnabled ?? null;

  void migrateLegacyGpsQueueIfNeeded();
  void flushGpsBuffer().catch(() => undefined);

  flushTimer = setInterval(() => {
    void flushGpsBuffer().catch(() => undefined);
  }, GPS_FLUSH_INTERVAL_MS);

  heartbeatTimer = setInterval(() => {
    void sendTrackingHeartbeat().catch(() => undefined);
  }, GPS_HEARTBEAT_INTERVAL_MS);
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

/** Bulk upload helper when only MMKV buffer should be sent. */
export async function pushBufferedLocations(points: GpsBufferPoint[]) {
  if (!points.length) return;
  if (points.length === 1) {
    await syncLocationQueue(points);
    return;
  }
  await pushLocationsBulk(points);
}
