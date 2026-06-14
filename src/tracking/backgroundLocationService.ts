import * as Location from "expo-location";
import { BRAND } from "../config/brand";
import { BACKGROUND_LOCATION_TASK } from "./registerBackgroundLocationTask";
import { trackingDevLog } from "./trackingDevLog";
import { isExpoGo } from "../utils/expoRuntime";

export const EXPO_GO_TRACKING_MESSAGE =
  "Expo Go only tracks GPS while this app is open. Install the dev build (npm run android) or field APK for full background route recording.";

export const BACKGROUND_PERMISSION_MESSAGE =
  "Allow location all the time for route tracking.";

export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export type StartBackgroundTrackingResult = {
  ok: boolean;
  expoGoLimited?: boolean;
  alreadyRunning?: boolean;
  message?: string;
};

export async function startBackgroundLocationTracking(): Promise<StartBackgroundTrackingResult> {
  if (isExpoGo()) {
    trackingDevLog("expo_go_limited", EXPO_GO_TRACKING_MESSAGE);
    return { ok: false, expoGoLimited: true, message: EXPO_GO_TRACKING_MESSAGE };
  }

  try {
    const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (already) {
      trackingDevLog("tracking_already_started", BACKGROUND_LOCATION_TASK);
      return { ok: true, alreadyRunning: true };
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      timeInterval: 60_000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: `${BRAND.appName} tracking`,
        notificationBody: "Your workday route is being recorded"
      }
    });

    trackingDevLog("tracking_task_started", BACKGROUND_LOCATION_TASK);
    trackingDevLog("tracking_started", BACKGROUND_LOCATION_TASK);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start background tracking.";
    trackingDevLog("task_error", message);
    return { ok: false, message };
  }
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (started) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      trackingDevLog("tracking_stopped", BACKGROUND_LOCATION_TASK);
    }
  } catch (err) {
    trackingDevLog("task_error", err instanceof Error ? err.message : "stop failed");
  }
}
