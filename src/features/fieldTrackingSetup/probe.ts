import * as Location from "expo-location";
import { Platform } from "react-native";
import { getAndroidApiLevel, getAndroidCapabilities } from "../../utils/androidCapabilities";
import { isExpoGo } from "../../utils/expoRuntime";
import { loadExpoNotifications } from "../../notifications/expoNotificationsAccess";
import { detectManufacturerFamily } from "./manufacturer";
import { readFieldTrackingSetupRecord } from "./persistence";
import type { FieldTrackingHealth, FieldTrackingProbe, SetupStepId, SetupStepState } from "./types";

async function readPreciseOk(foregroundGranted: boolean): Promise<boolean> {
  if (!foregroundGranted) return false;
  if (Platform.OS !== "android") return true;
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    const androidMeta = (fg as { android?: { accuracy?: string } }).android;
    if (androidMeta?.accuracy === "coarse") {
      return false;
    }
    if (androidMeta?.accuracy === "fine") {
      return true;
    }
    // Older APIs / Expo Go — treat granted FG as sufficient.
    return true;
  } catch {
    return true;
  }
}

async function readNotificationsGranted(required: boolean): Promise<boolean> {
  if (!required) return true;
  if (isExpoGo()) {
    return true;
  }
  try {
    const Notifications = await loadExpoNotifications();
    if (!Notifications) return false;
    const current = await Notifications.getPermissionsAsync();
    return current.granted || current.status === "granted";
  } catch {
    return false;
  }
}

/**
 * Battery unrestricted cannot always be verified without native PowerManager.
 * Returns null when unknown — guided acknowledgement is used instead.
 */
async function readBatteryUnrestricted(): Promise<boolean | null> {
  if (Platform.OS !== "android") return true;
  // No safe cross-OEM API in Expo without a custom native module.
  return null;
}

export async function probeFieldTrackingPermissions(): Promise<FieldTrackingProbe> {
  const caps = getAndroidCapabilities();
  const record = await readFieldTrackingSetupRecord();
  const expoGoLimited = isExpoGo() || caps.expoGoLimitedNative;

  let foregroundGranted = false;
  let backgroundGranted = false;
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    foregroundGranted = fg.status === "granted";
  } catch {
    foregroundGranted = false;
  }

  try {
    if (foregroundGranted && caps.requiresBackgroundLocationSeparate && !expoGoLimited) {
      const bg = await Location.getBackgroundPermissionsAsync();
      backgroundGranted = bg.status === "granted";
    } else if (foregroundGranted && !caps.requiresBackgroundLocationSeparate) {
      // Android 8–9: foreground covers available background behaviour.
      backgroundGranted = true;
    } else if (expoGoLimited && foregroundGranted) {
      // Expo Go cannot grant true background — mark as not granted.
      backgroundGranted = false;
    }
  } catch {
    backgroundGranted = false;
  }

  const preciseOk = await readPreciseOk(foregroundGranted);
  const notificationsRequired = caps.requiresNotificationPermission;
  const notificationsGranted = await readNotificationsGranted(notificationsRequired);
  const batteryUnrestricted = await readBatteryUnrestricted();

  return {
    foregroundGranted,
    backgroundGranted,
    preciseOk,
    notificationsGranted,
    notificationsRequired,
    batteryUnrestricted,
    oemGuidedDone: record.oemGuidedCompleted,
    batteryGuidedDone: record.batteryGuidedCompleted,
    expoGoLimited,
    apiLevel: getAndroidApiLevel(),
    manufacturerFamily: detectManufacturerFamily()
  };
}

/** Critical requirements for field work — foreground location only. */
export function listMissingCriticalSteps(probe: FieldTrackingProbe): SetupStepId[] {
  const missing: SetupStepId[] = [];
  if (!probe.foregroundGranted) missing.push("foreground");
  if (!probe.preciseOk) missing.push("precise");
  return missing;
}

export function isCriticalSetupReady(probe: FieldTrackingProbe): boolean {
  return listMissingCriticalSteps(probe).length === 0;
}

export async function getFieldTrackingHealth(): Promise<FieldTrackingHealth> {
  const probe = await probeFieldTrackingPermissions();
  const record = await readFieldTrackingSetupRecord();
  const missing = listMissingCriticalSteps(probe);
  const setupCompleted =
    Boolean(record.completedAt) &&
    record.lastCompletedVersion != null &&
    missing.length === 0;

  return {
    ready: missing.length === 0,
    missing,
    probe,
    setupCompleted
  };
}

export function buildChecklist(probe: FieldTrackingProbe): SetupStepState[] {
  const missing = new Set(listMissingCriticalSteps(probe));
  const steps: SetupStepState[] = [
    {
      id: "foreground",
      label: "Location access",
      required: true,
      status: probe.foregroundGranted ? "done" : missing.has("foreground") ? "needs_attention" : "pending"
    },
    {
      id: "precise",
      label: "Precise location",
      required: true,
      status: probe.preciseOk ? "done" : missing.has("precise") ? "needs_attention" : "pending"
    }
  ];
  return steps;
}

/**
 * Offer after password login when required permissions are incomplete
 * or setup was never completed for this version.
 */
export async function shouldOfferFieldTrackingSetup(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const health = await getFieldTrackingHealth();
  if (!health.ready) return true;
  const record = await readFieldTrackingSetupRecord();
  if (!record.completedAt || record.lastCompletedVersion == null) return true;
  return false;
}
