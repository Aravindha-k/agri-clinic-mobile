import * as TaskManager from "expo-task-manager";
import { BackgroundTaskResult } from "expo-background-task";
import { BACKGROUND_FIELD_SYNC_TASK } from "../../mobile/lib/sync/syncScheduler";
import { runAutomaticSync } from "../../mobile/lib/sync/automaticSyncCoordinator";
import { setActiveSyncUserId } from "../../mobile/lib/sync/queueOwnership";
import { getJson, setJson } from "../../mobile/lib/storage";

const BACKGROUND_USER_KEY = "background_sync_user_id_v1";

/** Persist active user id for background worker ownership checks. */
export function persistBackgroundSyncUserId(userId: number | null) {
  if (userId == null) return;
  setJson(BACKGROUND_USER_KEY, { userId, savedAt: new Date().toISOString() });
}

export function restoreBackgroundSyncUserId(): number | null {
  const row = getJson<{ userId?: number }>(BACKGROUND_USER_KEY, {});
  return row.userId ?? null;
}

if (!TaskManager.isTaskDefined(BACKGROUND_FIELD_SYNC_TASK)) {
  TaskManager.defineTask(BACKGROUND_FIELD_SYNC_TASK, async () => {
    const storedUserId = restoreBackgroundSyncUserId();
    if (storedUserId != null) {
      setActiveSyncUserId(storedUserId);
    }

    try {
      await runAutomaticSync("android_background_worker");
      return BackgroundTaskResult.Success;
    } catch {
      return BackgroundTaskResult.Failed;
    }
  });
}
