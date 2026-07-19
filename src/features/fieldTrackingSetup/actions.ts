import * as Location from "expo-location";
import { trackingDevLog } from "../../tracking/trackingDevLog";
import {
  markBatteryGuidedCompleted,
  markFieldTrackingSetupCompleted,
  markOemGuidedCompleted
} from "./persistence";
import { probeFieldTrackingPermissions, isCriticalSetupReady } from "./probe";
import {
  enableLocationForFieldWork,
  ensureForegroundLocationPermission,
  PERMANENTLY_DENIED_MESSAGE
} from "./ensureForegroundLocation";
import {
  openAppSettingsPage,
  openBatteryOptimizationSettings,
  openLocationPermissionSettings,
  openOemOrAppSettings
} from "./settingsIntents";

export type StepActionResult = {
  ok: boolean;
  /** Employee-facing message */
  message?: string;
  /** Opened system settings — caller should re-check on AppState active */
  openedSettings?: boolean;
  permanentlyDenied?: boolean;
};

/** Step 1 — Enable Location: foreground permission + device GPS (single-flight). */
export async function runForegroundLocationStep(): Promise<StepActionResult> {
  try {
    const result = await enableLocationForFieldWork();
    trackingDevLog(
      "foreground_permission",
      result.permission.granted ? "granted" : result.permission.status
    );
    if (!result.ok) {
      return {
        ok: false,
        permanentlyDenied: result.permanentlyDenied,
        openedSettings: false,
        message: result.message ?? PERMANENTLY_DENIED_MESSAGE
      };
    }
    return { ok: true, openedSettings: false };
  } catch {
    return { ok: false, message: "Could not enable location. Try again.", openedSettings: false };
  }
}

/**
 * Background location is not part of the product flow.
 * Kept as a no-op so older callers do not request ACCESS_BACKGROUND_LOCATION
 * or open App Info (Android 11+ settings trap).
 */
export async function runBackgroundLocationStep(): Promise<StepActionResult> {
  trackingDevLog("background_permission", "skipped_foreground_only");
  return { ok: true, message: "Foreground location is enough for field tracking." };
}

/** Precise guidance — never auto-opens Settings; employee must tap Open Settings. */
export async function openPreciseLocationSettings(): Promise<StepActionResult> {
  return {
    ok: false,
    openedSettings: false,
    message: "Keep Precise Location ON for Kavya Field, then tap Try Again."
  };
}

/** Optional guided battery step — only after an explicit employee tap. */
export async function runBatteryStep(): Promise<StepActionResult> {
  const opened = await openBatteryOptimizationSettings();
  await markBatteryGuidedCompleted();
  return {
    ok: true,
    openedSettings: opened,
    message: "Return here after adjusting battery settings."
  };
}

/** Optional OEM guidance — only after an explicit employee tap. */
export async function runOemStep(): Promise<StepActionResult> {
  const opened = await openOemOrAppSettings();
  await markOemGuidedCompleted();
  return {
    ok: true,
    openedSettings: opened,
    message: "Return here after applying phone battery tips."
  };
}

/** Notifications are optional and never auto-open Settings on deny. */
export async function runNotificationStep(): Promise<StepActionResult> {
  return { ok: true, message: "Notifications are optional for field tracking." };
}

export async function finalizeSetupIfReady(): Promise<boolean> {
  const probe = await probeFieldTrackingPermissions();
  if (!isCriticalSetupReady(probe)) {
    return false;
  }
  await markFieldTrackingSetupCompleted();
  return true;
}

/** Open Settings only from an explicit tap (permanently denied / optional help). */
export async function openSettingsForMissing(
  step: "foreground" | "background" | "precise" | "notifications" | "battery"
) {
  if (step === "battery") return openBatteryOptimizationSettings();
  if (step === "notifications") return openAppSettingsPage();
  return openLocationPermissionSettings();
}

export { ensureForegroundLocationPermission, enableLocationForFieldWork };
