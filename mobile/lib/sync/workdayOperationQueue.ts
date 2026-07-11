import { getJson, setJson } from "../storage";
import type { PendingWorkdayOperation } from "./fieldQueueTypes";
import { generateLocalOperationId } from "./queueIds";
import {
  filterQueueForActiveUser,
  getActiveSyncUserId,
  quarantineOrphanQueueItems
} from "./queueOwnership";
import { notifyFieldQueueChanged } from "./syncQueueNotifier";

export const WORKDAY_OPS_KEY = "pending_workday_ops_v1";

function nowIso() {
  return new Date().toISOString();
}

function readAll(): PendingWorkdayOperation[] {
  return getJson<PendingWorkdayOperation[]>(WORKDAY_OPS_KEY, []);
}

function writeAll(rows: PendingWorkdayOperation[]) {
  setJson(WORKDAY_OPS_KEY, rows);
}

export function readActiveUserWorkdayOps(): PendingWorkdayOperation[] {
  const all = readAll();
  const userId = getActiveSyncUserId();
  if (userId == null) return [];
  const { owned, orphans } = filterQueueForActiveUser(all, userId);
  if (orphans.length) {
    quarantineOrphanQueueItems("workday", orphans, "ownership_mismatch_or_missing_user");
    const orphanIds = new Set(orphans.map((o) => o.local_operation_id));
    writeAll(all.filter((r) => !orphanIds.has(r.local_operation_id)));
  }
  return owned.filter((r) => r.status === "pending" || r.status === "failed");
}

export function enqueueWorkdayEndOperation(params: {
  user_id: number;
  device_session_id?: string;
  server_workday_id?: number;
  server_duty_session_id?: number;
  local_workday_id?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}): PendingWorkdayOperation {
  const ts = nowIso();
  const row: PendingWorkdayOperation = {
    local_operation_id: generateLocalOperationId(),
    operation: "end",
    timestamp: ts,
    user_id: params.user_id,
    device_session_id: params.device_session_id,
    server_workday_id: params.server_workday_id,
    server_duty_session_id: params.server_duty_session_id,
    local_workday_id: params.local_workday_id,
    latitude: params.latitude,
    longitude: params.longitude,
    accuracy: params.accuracy,
    status: "pending",
    retry_count: 0,
    created_at: ts,
    updated_at: ts
  };
  const all = readAll();
  const existing = all.find(
    (r) =>
      r.user_id === params.user_id &&
      r.operation === "end" &&
      (r.status === "pending" || r.status === "failed")
  );
  if (existing) {
    return existing;
  }
  all.push(row);
  writeAll(all);
  notifyFieldQueueChanged("workday_end_queued");
  return row;
}

export function markWorkdayOpSynced(localOperationId: string) {
  const all = readAll();
  writeAll(
    all.filter((r) => r.local_operation_id !== localOperationId)
  );
}

export function markWorkdayOpFailed(localOperationId: string, error: string) {
  const all = readAll();
  writeAll(
    all.map((r) =>
      r.local_operation_id === localOperationId
        ? {
            ...r,
            status: "failed" as const,
            retry_count: r.retry_count + 1,
            last_error: error,
            updated_at: nowIso()
          }
        : r
    )
  );
}

export function countPendingWorkdayOps(): number {
  return readActiveUserWorkdayOps().length;
}
