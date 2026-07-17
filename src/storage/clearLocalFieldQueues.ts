import { clearPendingGpsBuffer } from "../../mobile/lib/gps/trackingService";
import { refreshSyncStoreCounts } from "../../mobile/lib/sync/offlineSyncManager";
import { removeKey, SYNC_STORAGE_KEYS } from "../../mobile/lib/storage";

/**
 * Clear local GPS + visit queues after SESSION_REPLACED (device A teardown).
 * Safe for sign-out when another device took the session.
 */
export function clearLocalFieldQueuesOnSessionReplace() {
  try {
    clearPendingGpsBuffer();
  } catch {
    /* best-effort */
  }
  try {
    removeKey(SYNC_STORAGE_KEYS.pendingVisits);
    removeKey(SYNC_STORAGE_KEYS.pendingGps);
  } catch {
    /* best-effort */
  }
  try {
    refreshSyncStoreCounts();
  } catch {
    /* best-effort */
  }
}
