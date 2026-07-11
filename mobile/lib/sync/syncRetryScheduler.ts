import type { AutomaticSyncTrigger } from "./automaticSyncCoordinator";
import { recordSyncDiagnostic } from "./syncDiagnostics";
import { useSyncStore } from "../store/syncStore";

const FOREGROUND_RETRY_DELAYS_MS = [0, 15_000, 60_000, 300_000] as const;

let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryTrigger: AutomaticSyncTrigger = "periodic_foreground";

export function resetForegroundSyncBackoff() {
  retryAttempt = 0;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  useSyncStore.getState().setNextScheduledRetryAt(null);
}

export function cancelForegroundSyncRetries() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  useSyncStore.getState().setNextScheduledRetryAt(null);
}

export function scheduleForegroundSyncRetry(
  trigger: AutomaticSyncTrigger,
  run: (trigger: AutomaticSyncTrigger) => Promise<unknown>
) {
  retryTrigger = trigger;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  const delayIndex = Math.min(retryAttempt, FOREGROUND_RETRY_DELAYS_MS.length - 1);
  const delayMs = FOREGROUND_RETRY_DELAYS_MS[delayIndex];
  retryAttempt += 1;

  const nextAt = new Date(Date.now() + delayMs).toISOString();
  useSyncStore.getState().setNextScheduledRetryAt(nextAt);

  recordSyncDiagnostic({
    event: "automatic_sync_retry_scheduled",
    trigger,
    errorCode: `retry_${retryAttempt}`,
    durationMs: delayMs
  });

  retryTimer = setTimeout(() => {
    retryTimer = null;
    void run(retryTrigger);
  }, delayMs);
}

export function noteForegroundSyncProgress() {
  retryAttempt = 0;
  useSyncStore.getState().setNextScheduledRetryAt(null);
}
