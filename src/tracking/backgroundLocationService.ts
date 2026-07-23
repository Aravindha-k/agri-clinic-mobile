import * as Location from "expo-location";
import { BRAND } from "../config/brand";
import { BACKGROUND_LOCATION_TASK } from "./registerBackgroundLocationTask";
import {
  getBackgroundTimeIntervalMs
} from "./trackingConfig";
import {
  canStartBackgroundWatcher,
  isDutyTrackingSessionActive,
  markBackgroundWatcherRunning,
  restoreDutySessionFromStorage
} from "./trackingSession";
import { trackingDevLog } from "./trackingDevLog";
import { isExpoGo } from "../utils/expoRuntime";

export const EXPO_GO_TRACKING_MESSAGE =
  "Expo Go only tracks GPS while this app is open. Install the field APK for background tracking during your workday.";

export const BACKGROUND_PERMISSION_MESSAGE =
  "Allow location all the time so field tracking can continue when the app is minimized.";

/** Persistent FGS notification — no coordinates. */
export const FIELD_TRACKING_NOTIFICATION_TITLE = `${BRAND.appName} — Field tracking active`;
export const FIELD_TRACKING_NOTIFICATION_BODY =
  "Your location is being updated during your workday.";

export const FIELD_TRACKING_NOTIFICATION_GPS_OFF_BODY =
  "Phone location is off. Turn GPS on so the office can see your latest field location.";

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

export type StartBackgroundTrackingOptions = {
  /** When GPS services are off, surface that in the persistent notification. */
  gpsEnabled?: boolean;
};

export async function startBackgroundLocationTracking(
  options?: StartBackgroundTrackingOptions
): Promise<StartBackgroundTrackingResult> {
  const dutyActive =
    isDutyTrackingSessionActive() || (await restoreDutySessionFromStorage());
  if (!dutyActive) {
    return { ok: false, message: "No active duty session." };
  }

  if (isExpoGo()) {
    trackingDevLog("expo_go_limited", EXPO_GO_TRACKING_MESSAGE);
    return { ok: false, expoGoLimited: true, message: EXPO_GO_TRACKING_MESSAGE };
  }

  try {
    const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (already) {
      markBackgroundWatcherRunning(true);
      trackingDevLog("tracking_already_started", BACKGROUND_LOCATION_TASK);
      return { ok: true, alreadyRunning: true };
    }

    if (!canStartBackgroundWatcher()) {
      trackingDevLog("tracking_already_started", "background_watcher_guard");
      return { ok: true, alreadyRunning: true };
    }

    const gpsEnabled = options?.gpsEnabled !== false;
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      // Balanced accuracy reduces battery while supporting ~5 min field updates.
      accuracy: Location.Accuracy.Balanced,
      // distanceInterval 0 → time-based wakes even when stationary (heartbeat path).
      // Movement filtering for route points remains in shouldSendLocation.
      distanceInterval: 0,
      timeInterval: getBackgroundTimeIntervalMs(),
      deferredUpdatesInterval: 0,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: FIELD_TRACKING_NOTIFICATION_TITLE,
        notificationBody: gpsEnabled
          ? FIELD_TRACKING_NOTIFICATION_BODY
          : FIELD_TRACKING_NOTIFICATION_GPS_OFF_BODY,
        notificationColor: "#0F6B43",
        killServiceOnDestroy: false
      }
    });

    trackingDevLog("tracking_task_started", BACKGROUND_LOCATION_TASK);
    trackingDevLog("tracking_started", BACKGROUND_LOCATION_TASK);
    markBackgroundWatcherRunning(true);
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
      markBackgroundWatcherRunning(false);
      trackingDevLog("tracking_stopped", BACKGROUND_LOCATION_TASK);
    }
  } catch (err) {
    trackingDevLog("task_error", err instanceof Error ? err.message : "stop failed");
  }
}
