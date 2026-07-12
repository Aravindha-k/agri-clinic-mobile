import * as Location from "expo-location";
import { readLocationServicesEnabled } from "./locationServicesProbe";

/** Device GPS / permission probe result (no permission prompt). */
export type GpsAvailability =
  | "active"
  | "services_off"
  | "permission_denied"
  | "permission_undetermined"
  | "foreground_only"
  | "background_denied";

export async function probeGpsAvailability(): Promise<GpsAvailability> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      if (permission.status === "denied" && !permission.canAskAgain) {
        return "permission_denied";
      }
      return "permission_undetermined";
    }

    const servicesEnabled = await readLocationServicesEnabled();
    if (!servicesEnabled) {
      return "services_off";
    }

    const background = await Location.getBackgroundPermissionsAsync();
    if (background.status === "granted") {
      return "active";
    }
    if (background.status === "denied" && !background.canAskAgain) {
      return "background_denied";
    }
    return "foreground_only";
  } catch {
    return "services_off";
  }
}

export function isGpsAvailable(availability: GpsAvailability) {
  return (
    availability === "active" ||
    availability === "foreground_only" ||
    availability === "background_denied"
  );
}
