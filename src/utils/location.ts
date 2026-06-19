import * as Location from "expo-location";
import type { LocationPushPayload } from "../api/tracking";
import { BACKGROUND_PERMISSION_MESSAGE } from "../tracking/backgroundLocationService";
import { trackingDevLog } from "../tracking/trackingDevLog";
import { hasValidMapCoords } from "./mapCoords";
import { getForegroundTrackingAccuracy } from "../tracking/trackingSession";

export type ForegroundLocationResult =
  | {
      granted: true;
      location: Location.LocationObject;
    }
  | {
      granted: false;
      message: string;
    };

export type TrackingPermissionResult = {
  foreground: boolean;
  background: boolean;
  message?: string;
};

async function readServicesEnabled() {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/** Foreground permission only — does not request background (visits, quick GPS checks). */
export async function ensureForegroundPermission(): Promise<{ granted: boolean; message?: string }> {
  const servicesEnabled = await readServicesEnabled();
  if (!servicesEnabled) {
    return {
      granted: false,
      message: "GPS is turned off. Please enable location services and try again."
    };
  }

  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted") {
    return { granted: true };
  }

  if (current.status === "denied" && !current.canAskAgain) {
    return {
      granted: false,
      message: "Location permission is required for field tracking."
    };
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  trackingDevLog("foreground_permission", requested.status);
  if (requested.status === "granted") {
    return { granted: true };
  }

  return {
    granted: false,
    message: "Location permission is required for field tracking."
  };
}

/** Request foreground then background location for route tracking. */
export async function ensureTrackingPermissions(): Promise<TrackingPermissionResult> {
  const servicesEnabled = await readServicesEnabled();
  if (!servicesEnabled) {
    return {
      foreground: false,
      background: false,
      message: "GPS is turned off. Please enable location services and try again."
    };
  }

  const currentForeground = await Location.getForegroundPermissionsAsync();
  let foregroundGranted = currentForeground.status === "granted";
  if (!foregroundGranted) {
    if (currentForeground.status === "denied" && !currentForeground.canAskAgain) {
      return {
        foreground: false,
        background: false,
        message: "Location permission is required for field tracking."
      };
    }
    const foreground = await Location.requestForegroundPermissionsAsync();
    trackingDevLog("foreground_permission", foreground.status);
    foregroundGranted = foreground.status === "granted";
  }

  if (!foregroundGranted) {
    return {
      foreground: false,
      background: false,
      message: "Location permission is required for field tracking."
    };
  }

  const currentBackground = await Location.getBackgroundPermissionsAsync();
  if (currentBackground.status === "granted") {
    return { foreground: true, background: true };
  }

  if (currentBackground.status === "denied" && !currentBackground.canAskAgain) {
    return {
      foreground: true,
      background: false,
      message: BACKGROUND_PERMISSION_MESSAGE
    };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  trackingDevLog("background_permission", background.status);
  if (background.status !== "granted") {
    return {
      foreground: true,
      background: false,
      message: BACKGROUND_PERMISSION_MESSAGE
    };
  }

  return { foreground: true, background: true };
}

export async function getForegroundLocation(): Promise<ForegroundLocationResult> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        granted: false,
        message: "GPS is turned off. Please enable location services and try again."
      };
    }

    const permission = await ensureForegroundPermission();
    if (!permission.granted) {
      return {
        granted: false,
        message: permission.message || "Location permission is required for field tracking."
      };
    }

    let location: Location.LocationObject | null = null;
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: getForegroundTrackingAccuracy(),
        mayShowUserSettingsDialog: true
      });
    } catch {
      location = await Location.getLastKnownPositionAsync();
    }

    if (!location) {
      return {
        granted: false,
        message: "Waiting for GPS fix. Try again in a few seconds or move to an open area."
      };
    }

    const { latitude, longitude } = location.coords;
    if (!hasValidMapCoords(latitude, longitude)) {
      return {
        granted: false,
        message: "Could not read a valid GPS position. Move to an open area and try again."
      };
    }

    return {
      granted: true,
      location
    };
  } catch {
    return {
      granted: false,
      message: "Unable to get location. Check GPS and try again."
    };
  }
}

export function toVisitLocation(location: Location.LocationObject) {
  const lat = location.coords.latitude;
  const lng = location.coords.longitude;
  if (!hasValidMapCoords(lat, lng)) {
    return { latitude: "", longitude: "" };
  }
  return {
    latitude: lat.toFixed(6),
    longitude: lng.toFixed(6)
  };
}

export function toTrackingPayload(
  location: Location.LocationObject,
  session?: { workdayId?: number; dutySessionId?: number },
  batteryLevel?: number | null
): LocationPushPayload {
  const lat = location.coords.latitude;
  const lng = location.coords.longitude;
  if (!hasValidMapCoords(lat, lng)) {
    throw new Error("Invalid GPS coordinates");
  }

  const capturedAt = new Date(location.timestamp).toISOString();
  const accuracy = location.coords.accuracy;
  const speed = location.coords.speed;
  const heading = location.coords.heading;
  const dutySessionId = session?.dutySessionId ?? session?.workdayId;

  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    accuracy: typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null,
    speed: typeof speed === "number" && Number.isFinite(speed) ? speed : null,
    heading: typeof heading === "number" && Number.isFinite(heading) ? heading : null,
    battery_level:
      typeof batteryLevel === "number" && Number.isFinite(batteryLevel) ? batteryLevel : null,
    captured_at: capturedAt,
    recorded_at: capturedAt,
    timestamp: capturedAt,
    ...(dutySessionId != null ? { duty_session_id: dutySessionId } : {}),
    ...(session?.workdayId != null ? { workday_id: session.workdayId } : {})
  };
}
