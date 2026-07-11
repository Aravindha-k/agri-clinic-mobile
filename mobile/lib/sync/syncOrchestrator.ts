import { endDutySession } from "../../../src/api/tracking";
import { getDeviceSessionId } from "../../../src/storage/deviceSessionStorage";
import { getActiveDutySessionId, getActiveWorkdayId } from "../../../src/storage/workdaySessionStorage";
import { flushPendingVisitEvidence } from "./pendingEvidenceQueue";
import { flushGPSQueue, flushVisitQueue } from "./offlineSyncManager";
import {
  countPendingWorkdayOps,
  markWorkdayOpFailed,
  markWorkdayOpSynced,
  readActiveUserWorkdayOps
} from "./workdayOperationQueue";
import { getFieldPendingCounts } from "./pendingCounts";
import { useSyncStore } from "../store/syncStore";

export type SyncPhase =
  | "idle"
  | "waiting_for_network"
  | "syncing"
  | "partial_failure"
  | "authentication_required"
  | "complete";

export type OrderedSyncResult = {
  visits: { synced: number; failed: number };
  evidence: { uploaded: number; remaining: number };
  gps: { synced: number };
  workdayEnd: { synced: number; failed: number };
  phase: SyncPhase;
};

let orderedSyncInFlight: Promise<OrderedSyncResult> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function getOrderedSyncInFlight(): Promise<OrderedSyncResult> | null {
  return orderedSyncInFlight;
}

async function flushPendingWorkdayEnds(): Promise<{ synced: number; failed: number }> {
  const ops = readActiveUserWorkdayOps().filter((r) => r.operation === "end");
  if (!ops.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  for (const op of ops) {
    try {
      await endDutySession(op.server_duty_session_id ?? (await getActiveDutySessionId()));
      markWorkdayOpSynced(op.local_operation_id);
      synced += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "workday end failed";
      if (/already ended|no active duty|inactive/i.test(message)) {
        markWorkdayOpSynced(op.local_operation_id);
        synced += 1;
        continue;
      }
      markWorkdayOpFailed(op.local_operation_id, message);
      failed += 1;
    }
  }
  return { synced, failed };
}

export async function runOrderedFieldSync(options?: {
  onVisitProgress?: Parameters<typeof flushVisitQueue>[0];
}): Promise<OrderedSyncResult> {
  if (orderedSyncInFlight) {
    return orderedSyncInFlight;
  }

  useSyncStore.getState().setSyncing(true);
  orderedSyncInFlight = (async () => {
    try {
      const sessionId = await getDeviceSessionId();
      if (!sessionId) {
        useSyncStore.getState().setSyncPhase("authentication_required");
        return {
          visits: { synced: 0, failed: 0 },
          evidence: { uploaded: 0, remaining: 0 },
          gps: { synced: 0 },
          workdayEnd: { synced: 0, failed: 0 },
          phase: "authentication_required" as SyncPhase
        };
      }

      useSyncStore.getState().setSyncPhase("syncing");

      const visits = await flushVisitQueue(options?.onVisitProgress);
      const evidence = await flushPendingVisitEvidence();
      const gps = await flushGPSQueue();
      const workdayEnd = await flushPendingWorkdayEnds();

      const counts = getFieldPendingCounts();
      const partial =
        visits.failed > 0 ||
        evidence.remaining > 0 ||
        counts.gps > 0 ||
        workdayEnd.failed > 0 ||
        counts.permanentFailures > 0;

      const phase: SyncPhase = partial ? "partial_failure" : "complete";
      useSyncStore.getState().setSyncPhase(phase);

      if (
        visits.synced > 0 ||
        gps.synced > 0 ||
        evidence.uploaded > 0 ||
        workdayEnd.synced > 0
      ) {
        useSyncStore.getState().setLastSynced(new Date().toISOString());
      }

      return { visits, evidence, gps, workdayEnd, phase };
    } finally {
      useSyncStore.getState().setSyncing(false);
      orderedSyncInFlight = null;
    }
  })();

  return orderedSyncInFlight;
}

export function scheduleDebouncedFieldSync(delayMs = 1500): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runOrderedFieldSync();
  }, delayMs);
}

export function countPendingWorkdayOperations(): number {
  return countPendingWorkdayOps();
}

export async function captureWorkdayEndContext() {
  const [dutyId, workdayId, sessionId] = await Promise.all([
    getActiveDutySessionId(),
    getActiveWorkdayId(),
    getDeviceSessionId()
  ]);
  return {
    server_duty_session_id: dutyId ?? undefined,
    server_workday_id: workdayId ?? undefined,
    device_session_id: sessionId ?? undefined
  };
}
