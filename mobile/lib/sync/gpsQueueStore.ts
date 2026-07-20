import { getJson, setJson, SYNC_STORAGE_KEYS } from "../storage";
import { GPS_QUEUE_MAX_POINTS } from "../../../src/tracking/trackingConfig";
import type { PendingGPSPoint, QueueSyncStatus } from "./fieldQueueTypes";
import { generateLocalPointId } from "./queueIds";
import {
  filterQueueForActiveUser,
  getActiveSyncUserId,
  quarantineOrphanQueueItems
} from "./queueOwnership";

/** Bound retries for otherwise-retryable GPS failures. */
export const MAX_GPS_RETRY_COUNT = 20;

function nowIso() {
  return new Date().toISOString();
}

/** Statuses eligible for network flush — never includes quarantined or synced. */
export function isFlushableGpsStatus(status: QueueSyncStatus | undefined): boolean {
  return status === "pending" || status === "failed" || status === "syncing";
}

export function selectFlushableGpsPoints(points: PendingGPSPoint[]): PendingGPSPoint[] {
  return points.filter((p) => isFlushableGpsStatus(p.sync_status));
}

export function isValidGpsCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function ensureGpsPointIdentity(
  point: Partial<PendingGPSPoint> & Omit<PendingGPSPoint, "local_point_id"> & { local_point_id?: string }
): PendingGPSPoint {
  const ts = nowIso();
  return {
    ...point,
    local_point_id: point.local_point_id || generateLocalPointId(),
    sync_status: point.sync_status ?? "pending",
    retry_count: point.retry_count ?? 0,
    created_at: point.created_at ?? ts,
    updated_at: point.updated_at ?? ts
  };
}

export function migrateGpsQueueRecords(raw: unknown[]): PendingGPSPoint[] {
  const migrated: PendingGPSPoint[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    if (
      typeof record.latitude !== "number" ||
      typeof record.longitude !== "number" ||
      !record.recorded_at
    ) {
      continue;
    }
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    let syncStatus = (record.sync_status as PendingGPSPoint["sync_status"]) ?? "pending";
    let failureCode = record.failure_code != null ? String(record.failure_code) : undefined;
    let lastError = record.last_error != null ? String(record.last_error) : undefined;
    if (!isValidGpsCoordinate(latitude, longitude)) {
      syncStatus = "quarantined";
      failureCode = failureCode ?? "INVALID_COORDINATES";
      lastError = lastError ?? "Malformed coordinates";
    }
    if (syncStatus !== "quarantined" && Number(record.retry_count ?? 0) >= MAX_GPS_RETRY_COUNT) {
      syncStatus = "quarantined";
      failureCode = failureCode ?? "MAX_RETRIES";
      lastError = lastError ?? "Exceeded GPS retry limit";
    }
    migrated.push(
      ensureGpsPointIdentity({
        local_point_id: String(record.local_point_id ?? generateLocalPointId()),
        latitude,
        longitude,
        accuracy: Number(record.accuracy ?? 0),
        speed: record.speed != null ? Number(record.speed) : null,
        heading: record.heading != null ? Number(record.heading) : null,
        battery_level: Number(record.battery_level ?? 0),
        duty_session_id:
          record.duty_session_id != null ? Number(record.duty_session_id) : undefined,
        server_workday_id:
          record.server_workday_id != null ? Number(record.server_workday_id) : undefined,
        local_workday_id:
          record.local_workday_id != null ? String(record.local_workday_id) : undefined,
        recorded_at: String(record.recorded_at),
        network_type: String(record.network_type ?? "unknown"),
        user_id: record.user_id != null ? Number(record.user_id) : undefined,
        device_session_id:
          record.device_session_id != null ? String(record.device_session_id) : undefined,
        sync_status: syncStatus,
        retry_count: Number(record.retry_count ?? 0),
        last_error: lastError,
        failure_code: failureCode,
        created_at: String(record.created_at ?? record.recorded_at),
        updated_at: record.updated_at != null ? String(record.updated_at) : undefined
      })
    );
  }
  return migrated;
}

export function readFullGpsQueue(): PendingGPSPoint[] {
  const raw = getJson<unknown[]>(SYNC_STORAGE_KEYS.pendingGps, []);
  return migrateGpsQueueRecords(Array.isArray(raw) ? raw : []);
}

export function writeFullGpsQueue(queue: PendingGPSPoint[]): void {
  const capped = queue.slice(-GPS_QUEUE_MAX_POINTS);
  setJson(SYNC_STORAGE_KEYS.pendingGps, capped);
}

/**
 * Active user's GPS rows that are not synced (includes quarantined for diagnostics).
 */
export function readActiveUserGpsQueueIncludingQuarantined(): PendingGPSPoint[] {
  const all = readFullGpsQueue();
  const userId = getActiveSyncUserId();
  if (userId == null) return [];
  const { owned, orphans } = filterQueueForActiveUser(all, userId);
  if (orphans.length) {
    quarantineOrphanQueueItems("gps", orphans, "ownership_mismatch_or_missing_user");
    const orphanIds = new Set(orphans.map((o) => o.local_point_id));
    writeFullGpsQueue(all.filter((p) => !orphanIds.has(p.local_point_id)));
  }
  return owned.filter((p) => p.sync_status !== "synced");
}

/**
 * Flushable GPS only — quarantined points stay in storage but never return here.
 */
export function readFlushableActiveUserGpsQueue(): PendingGPSPoint[] {
  return selectFlushableGpsPoints(readActiveUserGpsQueueIncludingQuarantined());
}

/** @deprecated Prefer readFlushableActiveUserGpsQueue for flush workers. */
export function readActiveUserGpsQueue(): PendingGPSPoint[] {
  return readFlushableActiveUserGpsQueue();
}

export function appendGpsQueuePoint(point: PendingGPSPoint): void {
  const all = readFullGpsQueue();
  const next = ensureGpsPointIdentity(point);
  if (!isValidGpsCoordinate(next.latitude, next.longitude)) {
    next.sync_status = "quarantined";
    next.failure_code = next.failure_code ?? "INVALID_COORDINATES";
    next.last_error = next.last_error ?? "Malformed coordinates";
  }
  all.push(next);
  if (all.length > GPS_QUEUE_MAX_POINTS) {
    all.splice(0, all.length - GPS_QUEUE_MAX_POINTS);
  }
  writeFullGpsQueue(all);
}

/** Remove only server-acknowledged GPS points by local_point_id. */
export function removeAcknowledgedGpsPoints(acceptedIds: string[]): number {
  if (!acceptedIds.length) return 0;
  const accepted = new Set(acceptedIds);
  const all = readFullGpsQueue();
  const before = all.length;
  const next = all.filter((p) => !accepted.has(p.local_point_id));
  writeFullGpsQueue(next);
  return before - next.length;
}

export function replaceActiveUserGpsQueue(nextOwned: PendingGPSPoint[]): void {
  const userId = getActiveSyncUserId();
  const all = readFullGpsQueue();
  if (userId == null) {
    writeFullGpsQueue(nextOwned);
    return;
  }
  const foreign = all.filter((p) => p.user_id != null && p.user_id !== userId);
  const orphans = all.filter((p) => p.user_id == null);
  if (orphans.length) {
    quarantineOrphanQueueItems("gps", orphans, "missing_user_id_on_replace");
  }
  writeFullGpsQueue([...foreign, ...nextOwned.map(ensureGpsPointIdentity)]);
}

/**
 * Explicit administrative discard — not used during normal workday teardown.
 */
export function discardAllGpsQueuePoints(): void {
  writeFullGpsQueue([]);
}

export function countActiveUserPendingGps(): number {
  return readFlushableActiveUserGpsQueue().length;
}

/** Quarantined rows kept for diagnostics (not flushable). */
export function countActiveUserQuarantinedGps(): number {
  return readActiveUserGpsQueueIncludingQuarantined().filter((p) => p.sync_status === "quarantined")
    .length;
}
