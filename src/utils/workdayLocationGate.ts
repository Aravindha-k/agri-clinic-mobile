import { Alert, Linking } from "react-native";
import * as Location from "expo-location";
import { ensureForegroundPermission } from "./location";
import { isGpsAvailable, probeGpsAvailability } from "./gpsStatus";

/** User-facing readiness for Start Workday (no prompts). */
export type LocationReadiness =
  | "checking"
  | "ready"
  | "permission_required"
  | "permission_blocked"
  | "services_off"
  | "unavailable";

export async function readLocationReadiness(): Promise<Exclude<LocationReadiness, "checking">> {
  try {
    const availability = await probeGpsAvailability();
    if (availability === "services_off") return "services_off";
    if (availability === "permission_denied") return "permission_blocked";
    if (availability === "permission_undetermined") return "permission_required";
    if (isGpsAvailable(availability)) return "ready";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

type GateCopy = {
  title: string;
  permissionBody: string;
  permissionBlockedBody: string;
  servicesOffBody: string;
  timeoutBody: string;
  allowLocation: string;
  openSettings: string;
  openLocationSettings: string;
  tryAgain: string;
  cancel: string;
};

/**
 * Permission / GPS gate before startDay().
 * Uses existing location utilities — does not change TrackingContext.
 */
export async function ensureLocationForWorkdayStart(copy: GateCopy): Promise<boolean> {
  const availability = await probeGpsAvailability();

  if (availability === "services_off") {
    return await promptServicesOff(copy);
  }

  if (isGpsAvailable(availability)) {
    return true;
  }

  if (availability === "permission_denied") {
    return await promptPermissionBlocked(copy);
  }

  // Undetermined / other — request foreground permission via existing helper.
  const permission = await ensureForegroundPermission();
  if (permission.granted) {
    return true;
  }

  if (permission.message?.includes("GPS is turned off")) {
    return await promptServicesOff(copy);
  }

  const current = await Location.getForegroundPermissionsAsync().catch(() => null);
  if (current && current.status === "denied" && !current.canAskAgain) {
    return await promptPermissionBlocked(copy);
  }

  return await promptPermissionRequired(copy);
}

function promptPermissionRequired(copy: GateCopy): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.permissionBody, [
      { text: copy.cancel, style: "cancel", onPress: () => resolve(false) },
      {
        text: copy.allowLocation,
        onPress: () => {
          void (async () => {
            const again = await ensureForegroundPermission();
            resolve(Boolean(again.granted));
          })();
        }
      }
    ]);
  });
}

function promptPermissionBlocked(copy: GateCopy): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.permissionBlockedBody, [
      { text: copy.cancel, style: "cancel", onPress: () => resolve(false) },
      {
        text: copy.openSettings,
        onPress: () => {
          void Linking.openSettings().catch(() => undefined);
          resolve(false);
        }
      }
    ]);
  });
}

function promptServicesOff(copy: GateCopy): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.servicesOffBody, [
      { text: copy.cancel, style: "cancel", onPress: () => resolve(false) },
      {
        text: copy.openLocationSettings,
        onPress: () => {
          void Linking.openSettings().catch(() => undefined);
          resolve(false);
        }
      }
    ]);
  });
}

export function locationTimeoutAlert(copy: GateCopy, onRetry: () => void) {
  Alert.alert(copy.title, copy.timeoutBody, [
    { text: copy.cancel, style: "cancel" },
    { text: copy.tryAgain, onPress: onRetry }
  ]);
}
