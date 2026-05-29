import * as Location from "expo-location";

/** Device GPS / permission probe result (no permission prompt). */
export type GpsAvailability = "active" | "services_off" | "permission_denied" | "permission_undetermined";

export async function probeGpsAvailability(): Promise<GpsAvailability> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return "services_off";
    }

    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === "granted") {
      return "active";
    }
    if (permission.status === "denied" && !permission.canAskAgain) {
      return "permission_denied";
    }
    if (permission.status === "denied") {
      return "permission_denied";
    }
    return "permission_undetermined";
  } catch {
    return "services_off";
  }
}

export function isGpsAvailable(availability: GpsAvailability) {
  return availability === "active";
}
