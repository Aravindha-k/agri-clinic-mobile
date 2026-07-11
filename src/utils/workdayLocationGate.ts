import { Alert, Linking, Platform } from "react-native";
import * as Location from "expo-location";
import { ensureAndroidLocationServicesEnabled } from "./ensureAndroidLocationServices";
import { isGpsAvailable, probeGpsAvailability } from "./gpsStatus";

/** User-facing readiness for Start Workday (no prompts). */
export type LocationReadiness =
  | "checking"
  | "ready"
  | "permission_required"
  | "permission_blocked"
  | "services_off"
  | "unavailable";

export type WorkdayLocationGateReason =
  | "permission_required"
  | "permission_blocked"
  | "services_cancelled"
  | "services_unavailable"
  | "busy";

export type WorkdayLocationGateResult =
  | { ok: true }
  | { ok: false; reason: WorkdayLocationGateReason };

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

export type WorkdayLocationGateCopy = {
  title: string;
  permissionBody: string;
  permissionBlockedBody: string;
  servicesOffBody: string;
  servicesResolutionUnavailable: string;
  timeoutBody: string;
  allowLocation: string;
  openSettings: string;
  openLocationSettings: string;
  tryAgain: string;
  cancel: string;
};

let gateInFlight = false;

/**
 * Permission → device location services → ready for existing startDay().
 * Does not change TrackingContext. Android GPS-off uses in-app SettingsClient dialog.
 */
export async function ensureLocationForWorkdayStart(
  copy: WorkdayLocationGateCopy
): Promise<WorkdayLocationGateResult> {
  if (gateInFlight) {
    return { ok: false, reason: "busy" };
  }
  gateInFlight = true;

  try {
    const permission = await ensureAppLocationPermission(copy);
    if (!permission.ok) {
      return permission;
    }

    const services = await ensureDeviceLocationServices(copy);
    return services;
  } finally {
    gateInFlight = false;
  }
}

/** App permission only — does not require device GPS to already be on. */
async function ensureAppLocationPermission(
  copy: WorkdayLocationGateCopy
): Promise<WorkdayLocationGateResult> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "granted") {
      return { ok: true };
    }

    if (current.status === "denied" && !current.canAskAgain) {
      await promptPermissionBlocked(copy);
      return { ok: false, reason: "permission_blocked" };
    }

    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status === "granted") {
      return { ok: true };
    }

    if (requested.status === "denied" && !requested.canAskAgain) {
      await promptPermissionBlocked(copy);
      return { ok: false, reason: "permission_blocked" };
    }

    const retry = await promptPermissionRequired(copy);
    return retry ? { ok: true } : { ok: false, reason: "permission_required" };
  } catch {
    await promptPermissionBlocked(copy);
    return { ok: false, reason: "permission_blocked" };
  }
}

async function ensureDeviceLocationServices(
  copy: WorkdayLocationGateCopy
): Promise<WorkdayLocationGateResult> {
  const result = await ensureAndroidLocationServicesEnabled();

  if (result.status === "enabled" || result.status === "enabled_by_user") {
    return { ok: true };
  }

  if (result.status === "cancelled") {
    // Stay in-app — inline Try Again; do not open Settings.
    return { ok: false, reason: "services_cancelled" };
  }

  // Resolution unavailable / error — Settings only as fallback.
  await promptServicesFallback(copy);
  return { ok: false, reason: "services_unavailable" };
}

function promptPermissionRequired(copy: WorkdayLocationGateCopy): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.permissionBody, [
      { text: copy.cancel, style: "cancel", onPress: () => resolve(false) },
      {
        text: copy.allowLocation,
        onPress: () => {
          void (async () => {
            const again = await Location.requestForegroundPermissionsAsync().catch(() => null);
            resolve(again?.status === "granted");
          })();
        }
      }
    ]);
  });
}

function promptPermissionBlocked(copy: WorkdayLocationGateCopy): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.permissionBlockedBody, [
      { text: copy.cancel, style: "cancel", onPress: () => resolve() },
      {
        text: copy.openSettings,
        onPress: () => {
          // App permission page — not generic location settings.
          void Linking.openSettings().catch(() => undefined);
          resolve();
        }
      }
    ]);
  });
}

function promptServicesFallback(copy: WorkdayLocationGateCopy): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.servicesResolutionUnavailable, [
      { text: copy.cancel, style: "cancel", onPress: () => resolve() },
      {
        text: copy.openLocationSettings,
        onPress: () => {
          void openLocationSettingsFallback().finally(() => resolve());
        }
      }
    ]);
  });
}

async function openLocationSettingsFallback() {
  try {
    if (Platform.OS === "android") {
      await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
      return;
    }
    await Linking.openSettings();
  } catch {
    try {
      await Linking.openSettings();
    } catch {
      /* ignore */
    }
  }
}

export function locationTimeoutAlert(copy: WorkdayLocationGateCopy, onRetry: () => void) {
  Alert.alert(copy.title, copy.timeoutBody, [
    { text: copy.cancel, style: "cancel" },
    { text: copy.tryAgain, onPress: onRetry }
  ]);
}
