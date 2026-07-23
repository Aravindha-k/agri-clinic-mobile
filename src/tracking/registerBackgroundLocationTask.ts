import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { trackingDevLog } from "./trackingDevLog";

export const BACKGROUND_LOCATION_TASK = "KAVYA_BACKGROUND_LOCATION";

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    try {
      if (error) {
        trackingDevLog("task_error", error.message);
        // Still heartbeat — Admin Online must not depend on a successful GPS fix.
        const { emitTrackingHeartbeat } = await import("./heartbeatService");
        await emitTrackingHeartbeat({ gpsEnabledHint: false }).catch(() => undefined);
        return;
      }

      const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
      const { processBackgroundLocations } = await import("./locationSyncService");
      // Always process (even empty) so stationary / lock-screen wakes still heartbeat.
      await processBackgroundLocations(Array.isArray(locations) ? locations : []);
    } catch (err) {
      trackingDevLog(
        "task_error",
        err instanceof Error ? err.message : "background task handler failed"
      );
      try {
        const { emitTrackingHeartbeat } = await import("./heartbeatService");
        await emitTrackingHeartbeat().catch(() => undefined);
      } catch {
        // best-effort
      }
    }
  });
  trackingDevLog("task_registered", BACKGROUND_LOCATION_TASK);
}
