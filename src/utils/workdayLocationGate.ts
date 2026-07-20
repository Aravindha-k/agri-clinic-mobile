import { Alert } from "react-native";
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
 * Delegates to the canonical location readiness gate.
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
    const { ensureLocationReadyForAction } = await import(
      "../features/fieldTrackingSetup/locationReadinessGate"
    );
    const readiness = await ensureLocationReadyForAction();
    if (readiness.status === "ready") {
      return { ok: true };
    }
    if (readiness.status === "permission_denied_permanent") {
      return { ok: false, reason: "permission_blocked" };
    }
    if (
      readiness.status === "permission_denied_retryable" ||
      readiness.status === "error"
    ) {
      return { ok: false, reason: "permission_required" };
    }
    if (readiness.status === "cancelled") {
      return { ok: false, reason: "services_cancelled" };
    }
    return { ok: false, reason: "services_unavailable" };
  } finally {
    gateInFlight = false;
  }
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
