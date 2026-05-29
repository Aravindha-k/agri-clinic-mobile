import * as Location from "expo-location";
import type { LocationPushPayload } from "../api/tracking";
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

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true
    });

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

export function toTrackingPayload(location: Location.LocationObject): LocationPushPayload {
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
    recorded_at: capturedAt
  };
}
