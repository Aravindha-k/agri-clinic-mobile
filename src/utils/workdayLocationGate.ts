import { Alert } from "react-native";
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
 * Stays in-app: no Settings redirects — callers show inline errors / retry buttons.
 */
export async function ensureLocationForWorkdayStart(
  _copy: WorkdayLocationGateCopy
): Promise<WorkdayLocationGateResult> {
  if (gateInFlight) {
    return { ok: false, reason: "busy" };
  }
  gateInFlight = true;

  try {
    const permission = await ensureAppLocationPermission();
    if (!permission.ok) {
      return permission;
    }

    return ensureDeviceLocationServices();
  } finally {
    gateInFlight = false;
  }
}

/** App permission only — check-only, never requests OS dialog. */
async function ensureAppLocationPermission(): Promise<WorkdayLocationGateResult> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "granted") {
      return { ok: true };
    }

    if (current.status === "denied" && !current.canAskAgain) {
      return { ok: false, reason: "permission_blocked" };
    }

    return { ok: false, reason: "permission_required" };
  } catch {
    return { ok: false, reason: "permission_blocked" };
  }
}

async function ensureDeviceLocationServices(): Promise<WorkdayLocationGateResult> {
  const result = await ensureAndroidLocationServicesEnabled();

  if (result.status === "enabled" || result.status === "enabled_by_user") {
    return { ok: true };
  }

  if (result.status === "cancelled") {
    return { ok: false, reason: "services_cancelled" };
  }

  return { ok: false, reason: "services_unavailable" };
}

export function locationTimeoutAlert(copy: WorkdayLocationGateCopy, onRetry: () => void) {
  Alert.alert(copy.title, copy.timeoutBody, [
    { text: copy.cancel, style: "cancel" },
    { text: copy.tryAgain, onPress: onRetry }
  ]);
}

export async function openAppLocationSettings() {
  const { Linking } = await import("react-native");
  await Linking.openSettings().catch(() => undefined);
}

export async function openDeviceLocationSettings() {
  const { Linking, Platform } = await import("react-native");
  try {
    if (Platform.OS === "android") {
      await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
      return;
    }
    await Linking.openSettings();
  } catch {
    await Linking.openSettings().catch(() => undefined);
  }
}
