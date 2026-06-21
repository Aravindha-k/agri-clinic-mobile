import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { trackingDevLog } from "./trackingDevLog";

export const BACKGROUND_LOCATION_TASK = "KAVYA_BACKGROUND_LOCATION";

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    try {
      if (error) {
        trackingDevLog("task_error", error.message);
        return;
      }
      if (data) {
        const { locations } = data as { locations?: Location.LocationObject[] };
        if (locations?.length) {
          const { processBackgroundLocations } = await import("./locationSyncService");
          await processBackgroundLocations(locations);
        }
      }
    } catch (err) {
      trackingDevLog(
        "task_error",
        err instanceof Error ? err.message : "background task handler failed"
      );
    }
  });
  trackingDevLog("task_registered", BACKGROUND_LOCATION_TASK);
}
