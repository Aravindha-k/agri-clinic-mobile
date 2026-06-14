import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { processBackgroundLocations } from "./locationSyncService";
import { trackingDevLog } from "./trackingDevLog";

export const BACKGROUND_LOCATION_TASK = "KAVYA_BACKGROUND_LOCATION";

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      trackingDevLog("task_error", error.message);
      return;
    }
    if (data) {
      const { locations } = data as { locations?: Location.LocationObject[] };
      if (locations?.length) {
        await processBackgroundLocations(locations);
      }
    }
  });
  trackingDevLog("task_registered", BACKGROUND_LOCATION_TASK);
}
