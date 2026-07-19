import * as Location from "expo-location";
import type { LocationPushPayload } from "../api/tracking";
import { hasValidMapCoords } from "./mapCoords";
import { readLocationServicesEnabled } from "./locationServicesProbe";
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
  return readLocationServicesEnabled();
}

/**
 * Check-only — never opens the system permission dialog.
 * Permission requests belong exclusively in Field Tracking Setup Continue actions.
 * @deprecated Prefer checkForegroundPermission or probeLocationReadiness.
 */
export async function ensureForegroundPermission(): Promise<{ granted: boolean; message?: string }> {
  return checkForegroundPermission();
}

/**
 * Check-only — never opens the system permission dialog.
 * Use on map screens so employees are not asked every time they open a map.
 */
export async function checkForegroundPermission(): Promise<{ granted: boolean; message?: string }> {
  const servicesEnabled = await readServicesEnabled();
  if (!servicesEnabled) {
    return {
      granted: false,
      message: "GPS is turned off. Please enable location services and try again."
    };
  }

  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "granted") {
      return { granted: true };
    }
    return {
      granted: false,
      message: "Location access is off. Open Field Tracking Setup in Settings once."
    };
  } catch {
    return {
      granted: false,
      message: "Location access is off. Open Field Tracking Setup in Settings once."
    };
  }
}

/**
 * Read GPS only when already granted — never prompts.
 * Map / weather / preview surfaces must use this, not getForegroundLocation().
 */
export async function readForegroundLocationIfGranted(): Promise<ForegroundLocationResult> {
  try {
    const permission = await checkForegroundPermission();
    if (!permission.granted) {
      return {
        granted: false,
        message: permission.message || "Location access is off."
      };
    }

    let location: Location.LocationObject | null = null;
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: getForegroundTrackingAccuracy(),
        mayShowUserSettingsDialog: false
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

    return { granted: true, location };
  } catch {
    return {
      granted: false,
      message: "Unable to get location. Check GPS and try again."
    };
  }
}

/** Check-only workday start permissions — never requests OS dialogs. */
export async function ensureWorkdayStartPermissions(): Promise<TrackingPermissionResult> {
  const servicesEnabled = await readServicesEnabled();
  if (!servicesEnabled) {
    return {
      foreground: false,
      background: false,
      message: "GPS is turned off. Please enable location services and try again."
    };
  }

  const currentForeground = await Location.getForegroundPermissionsAsync();
  if (currentForeground.status !== "granted") {
    return {
      foreground: false,
      background: false,
      message: "Location permission is required for field tracking."
    };
  }

  const currentBackground = await Location.getBackgroundPermissionsAsync();
  return {
    foreground: true,
    background: currentBackground.status === "granted"
  };
}

/**
 * Check-only tracking permissions — never requests OS dialogs.
 * Requesting belongs in Field Tracking Setup only.
 */
export async function ensureTrackingPermissions(): Promise<TrackingPermissionResult> {
  return ensureWorkdayStartPermissions();
}

export async function getForegroundLocation(): Promise<ForegroundLocationResult> {
  try {
    const servicesEnabled = await readLocationServicesEnabled();
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
        mayShowUserSettingsDialog: false
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

/**
 * Same as getForegroundLocation, but never hangs forever on OEM GPS stalls.
 * Used by visit submit and other user-facing flows with a spinner.
 */
export async function getForegroundLocationWithTimeout(
  timeoutMs = 12_000
): Promise<ForegroundLocationResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ForegroundLocationResult>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        granted: false,
        message: "Unable to get location. Check GPS and try again."
      });
    }, timeoutMs);
  });

  try {
    return await Promise.race([getForegroundLocation(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
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
  batteryLevel?: number | null,
  clientPointId?: string
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
    ...(clientPointId ? { client_point_id: clientPointId } : {}),
    ...(dutySessionId != null ? { duty_session_id: dutySessionId } : {}),
    ...(session?.workdayId != null ? { workday_id: session.workdayId } : {})
  };
}
