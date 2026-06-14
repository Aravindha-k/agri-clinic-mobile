import * as Location from "expo-location";
import type { LocationPushPayload } from "../api/tracking";
import { BACKGROUND_PERMISSION_MESSAGE } from "../tracking/backgroundLocationService";
import { trackingDevLog } from "../tracking/trackingDevLog";
import { hasValidMapCoords } from "./mapCoords";

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

/** Request foreground then background location for route tracking. */
export async function ensureTrackingPermissions(): Promise<TrackingPermissionResult> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return {
      foreground: false,
      background: false,
      message: "GPS is turned off. Please enable location services and try again."
    };
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  trackingDevLog("foreground_permission", foreground.status);
  if (foreground.status !== "granted") {
    return {
      foreground: false,
      background: false,
      message: "Location permission is required for field tracking."
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

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return {
        granted: false,
        message: "Location permission is required for field tracking."
      };
    }

    let location: Location.LocationObject | null = null;
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
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
  workdayId?: number
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

  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    accuracy: typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null,
    speed: typeof speed === "number" && Number.isFinite(speed) ? speed : null,
    heading: typeof heading === "number" && Number.isFinite(heading) ? heading : null,
    captured_at: capturedAt,
    recorded_at: capturedAt,
    timestamp: capturedAt,
    ...(workdayId != null ? { workday_id: workdayId } : {})
  };
}
