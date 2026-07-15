import NetInfo from "@react-native-community/netinfo";
import { getAccessToken } from "../../../src/storage/tokenStorage";
import { getDeviceSessionId } from "../../../src/storage/deviceSessionStorage";
import { getFieldPendingCounts } from "./pendingCounts";
import { getActiveSyncUserId } from "./queueOwnership";
import { refreshSyncStoreCounts } from "./offlineSyncManager";
import { runOrderedFieldSync, type OrderedSyncResult, type SyncPhase } from "./syncOrchestrator";
import { reconcileWorkdayForSync } from "./workdayReconcile";
import { recordSyncDiagnostic } from "./syncDiagnostics";
import {
  cancelForegroundSyncRetries,
  noteForegroundSyncProgress,
  resetForegroundSyncBackoff,
  scheduleForegroundSyncRetry
} from "./syncRetryScheduler";
import {
  cancelBackgroundFieldSync,
  scheduleBackgroundFieldSync
} from "./syncScheduler";
import { useSyncStore } from "../store/syncStore";
import { emitFieldQueueChange } from "./syncQueueNotifier";

export type AutomaticSyncTrigger =
  | "app_start"
  | "app_foreground"
  | "network_reconnected"
  | "visit_queued"
  | "workday_end_queued"
  | "periodic_foreground"
  | "android_background_worker"
  | "authentication_restored"
  | "diagnostics_retry";

export type AutomaticSyncResult = OrderedSyncResult & {
  skipped?: boolean;
  skipReason?: "no_network" | "no_auth" | "no_device_session" | "already_in_flight" | "no_pending";
};

let coordinatorInFlight: Promise<AutomaticSyncResult> | null = null;
let lastNetDebounceTimer: ReturnType<typeof setTimeout> | null = null;

async function isDeviceOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

function hasRetryablePending(counts: ReturnType<typeof getFieldPendingCounts>): boolean {
  return counts.total > 0;
}

function deriveSyncHealth(
  online: boolean,
  counts: ReturnType<typeof getFieldPendingCounts>,
  phase: SyncPhase,
  syncing: boolean
): Parameters<ReturnType<typeof useSyncStore.getState>["setSyncHealth"]>[0] {
  if (phase === "authentication_required") return "auth_required";
  if (counts.permanentFailures > 0) return "attention_required";
  if (syncing || phase === "syncing") return "syncing";
  if (!online && counts.total > 0) return "offline_saving";
  if (!online && counts.total === 0) return "synced";
  if (online && counts.total > 0) return "syncing";
  return "synced";
}

export async function runAutomaticSync(
  trigger: AutomaticSyncTrigger,
  options?: { force?: boolean }
): Promise<AutomaticSyncResult> {
  // Manual/diagnostic force may bypass scheduling gates, never the single-flight lock.
  if (coordinatorInFlight) {
    return coordinatorInFlight;
  }

  const startedAt = Date.now();
  useSyncStore.getState().setLastAutomaticAttemptAt(new Date().toISOString());

  coordinatorInFlight = (async (): Promise<AutomaticSyncResult> => {
    const countsBefore = getFieldPendingCounts();
    refreshSyncStoreCounts();

    if (countsBefore.total <= 0 && trigger !== "diagnostics_retry") {
      await cancelBackgroundFieldSync();
      useSyncStore.getState().setSyncHealth("synced");
      resetForegroundSyncBackoff();
      return {
        visits: { synced: 0, failed: 0 },
        evidence: { uploaded: 0, remaining: 0 },
        gps: { synced: 0 },
        workdayEnd: { synced: 0, failed: 0 },
        phase: "complete",
        skipped: true,
        skipReason: "no_pending"
      };
    }

    const userId = getActiveSyncUserId();
    const token = await getAccessToken();
    if (!token || userId == null) {
      recordSyncDiagnostic({
        event: "automatic_sync_skipped_no_auth",
        trigger,
        counts: {
          visits: countsBefore.visits,
          photos: countsBefore.photos,
          gps: countsBefore.gps,
          workdayOps: countsBefore.workdayOps
        },
        errorCode: "no_auth"
      });
      useSyncStore.getState().setSyncPhase("authentication_required");
      useSyncStore.getState().setSyncHealth("auth_required");
      return {
        visits: { synced: 0, failed: 0 },
        evidence: { uploaded: 0, remaining: 0 },
        gps: { synced: 0 },
        workdayEnd: { synced: 0, failed: 0 },
        phase: "authentication_required",
        skipped: true,
        skipReason: "no_auth"
      };
    }

    const sessionId = await getDeviceSessionId();
    if (!sessionId) {
      recordSyncDiagnostic({
        event: "automatic_sync_skipped_no_auth",
        trigger,
        errorCode: "no_device_session"
      });
      useSyncStore.getState().setSyncPhase("authentication_required");
      useSyncStore.getState().setSyncHealth("auth_required");
      return {
        visits: { synced: 0, failed: 0 },
        evidence: { uploaded: 0, remaining: 0 },
        gps: { synced: 0 },
        workdayEnd: { synced: 0, failed: 0 },
        phase: "authentication_required",
        skipped: true,
        skipReason: "no_device_session"
      };
    }

    const online = await isDeviceOnline();
    if (!online) {
      recordSyncDiagnostic({
        event: "automatic_sync_skipped_no_network",
        trigger,
        counts: {
          visits: countsBefore.visits,
          photos: countsBefore.photos,
          gps: countsBefore.gps,
          workdayOps: countsBefore.workdayOps
        }
      });
      useSyncStore.getState().setSyncHealth("offline_saving");
      await scheduleBackgroundFieldSync();
      return {
        visits: { synced: 0, failed: 0 },
        evidence: { uploaded: 0, remaining: 0 },
        gps: { synced: 0 },
        workdayEnd: { synced: 0, failed: 0 },
        phase: "waiting_for_network",
        skipped: true,
        skipReason: "no_network"
      };
    }

    recordSyncDiagnostic({
      event: trigger === "android_background_worker" ? "background_worker_started" : "automatic_sync_started",
      trigger,
      counts: {
        visits: countsBefore.visits,
        photos: countsBefore.photos,
        gps: countsBefore.gps,
        workdayOps: countsBefore.workdayOps
      }
    });

    useSyncStore.getState().setSyncHealth("syncing");

    const reconcile = await reconcileWorkdayForSync();
    if (!reconcile.ok && reconcile.reason === "auth_required") {
      recordSyncDiagnostic({
        event: "background_worker_auth_required",
        trigger,
        errorCode: "auth_required"
      });
      useSyncStore.getState().setSyncPhase("authentication_required");
      useSyncStore.getState().setSyncHealth("auth_required");
      await scheduleBackgroundFieldSync();
      return {
        visits: { synced: 0, failed: 0 },
        evidence: { uploaded: 0, remaining: 0 },
        gps: { synced: 0 },
        workdayEnd: { synced: 0, failed: 0 },
        phase: "authentication_required",
        skipped: true,
        skipReason: "no_auth"
      };
    }

    const result = await runOrderedFieldSync();
    refreshSyncStoreCounts();

    const countsAfter = getFieldPendingCounts();
    const madeProgress =
      result.visits.synced > 0 ||
      result.gps.synced > 0 ||
      result.evidence.uploaded > 0 ||
      result.workdayEnd.synced > 0;

    if (madeProgress) {
      noteForegroundSyncProgress();
      emitFieldQueueChange("sync_progress");
    }

    const health = deriveSyncHealth(true, countsAfter, result.phase, false);
    useSyncStore.getState().setSyncHealth(health);

    const durationMs = Date.now() - startedAt;
    recordSyncDiagnostic({
      event:
        result.phase === "complete"
          ? "automatic_sync_completed"
          : result.phase === "partial_failure"
            ? "automatic_sync_partial"
            : "automatic_sync_progress",
      trigger,
      counts: {
        visits: countsAfter.visits,
        photos: countsAfter.photos,
        gps: countsAfter.gps,
        workdayOps: countsAfter.workdayOps
      },
      durationMs
    });

    if (trigger === "android_background_worker") {
      recordSyncDiagnostic({
        event: "background_worker_finished",
        trigger,
        workerResult: result.phase,
        durationMs
      });
    }

    if (hasRetryablePending(countsAfter) && result.phase !== "authentication_required") {
      if (trigger === "android_background_worker") {
        await scheduleBackgroundFieldSync();
      } else {
        scheduleForegroundSyncRetry(trigger, runAutomaticSync);
        await scheduleBackgroundFieldSync();
      }
    } else if (countsAfter.total === 0) {
      resetForegroundSyncBackoff();
      cancelForegroundSyncRetries();
      await cancelBackgroundFieldSync();
    }

    return result;
  })();

  try {
    return await coordinatorInFlight;
  } finally {
    coordinatorInFlight = null;
  }
}

export function scheduleDebouncedAutomaticSync(
  trigger: AutomaticSyncTrigger,
  delayMs = 500
): void {
  if (lastNetDebounceTimer) {
    clearTimeout(lastNetDebounceTimer);
  }
  lastNetDebounceTimer = setTimeout(() => {
    lastNetDebounceTimer = null;
    void runAutomaticSync(trigger);
  }, delayMs);
}

/** @deprecated Use syncQueueNotifier.notifyFieldQueueChanged */
export function notifyFieldQueueChanged(trigger: AutomaticSyncTrigger): void {
  void import("./syncQueueNotifier").then((mod) => mod.notifyFieldQueueChanged(trigger));
}

/** @deprecated Use runAutomaticSync — kept for diagnostics and emergency retry. */
export async function syncAllViaCoordinator(trigger: AutomaticSyncTrigger = "diagnostics_retry") {
  return runAutomaticSync(trigger, { force: true });
}
