import * as TaskManager from "expo-task-manager";
import { BackgroundTaskResult } from "expo-background-task";
import { BACKGROUND_FIELD_SYNC_TASK } from "../../mobile/lib/sync/syncScheduler";
import { runAutomaticSync } from "../../mobile/lib/sync/automaticSyncCoordinator";
import { setActiveSyncUserId } from "../../mobile/lib/sync/queueOwnership";
import { restoreBackgroundSyncUserId } from "./backgroundSyncUserId";

export { persistBackgroundSyncUserId, restoreBackgroundSyncUserId } from "./backgroundSyncUserId";

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
