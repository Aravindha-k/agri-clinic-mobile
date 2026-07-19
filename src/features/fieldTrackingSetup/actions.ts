import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { androidAtLeast } from "../../utils/androidCapabilities";
import { trackingDevLog } from "../../tracking/trackingDevLog";
import {
  markBatteryGuidedCompleted,
  markFieldTrackingSetupCompleted,
  markOemGuidedCompleted
} from "./persistence";
import { probeFieldTrackingPermissions, isCriticalSetupReady } from "./probe";
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
};

/** Step 1 — foreground + precise guidance. */
export async function runForegroundLocationStep(): Promise<StepActionResult> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status !== "granted") {
      const requested = await Location.requestForegroundPermissionsAsync();
      trackingDevLog("foreground_permission", requested.status);
      if (requested.status !== "granted") {
        const blocked = requested.status === "denied" && !requested.canAskAgain;
        return {
          ok: false,
          message: blocked
            ? "Location was turned off. Tap Open Settings, then allow location."
            : "Choose “While using the app” and keep Precise Location ON.",
          openedSettings: false
        };
      }
    }

    const probe = await probeFieldTrackingPermissions();
    if (!probe.preciseOk && androidAtLeast(31)) {
      return {
        ok: false,
        message: "Turn Precise Location ON for Kavya Field, then return here.",
        openedSettings: false
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "Could not request location. Try Open Settings." };
  }
}

/** Step 2 — background location (Android 10 request, 11+ settings). */
export async function runBackgroundLocationStep(): Promise<StepActionResult> {
  const probe = await probeFieldTrackingPermissions();
  if (probe.expoGoLimited) {
    return {
      ok: true,
      message: "Full background tracking needs a development build or field APK."
    };
  }
  if (probe.backgroundGranted) {
    return { ok: true };
  }
  if (!probe.foregroundGranted) {
    return { ok: false, message: "Allow location access first." };
  }

  // Android 10 (API 29): system can show background dialog after FG grant.
  // Android 11+ (API 30+): usually need app settings → Allow all the time.
  if (androidAtLeast(30)) {
    const opened = await openLocationPermissionSettings();
    return {
      ok: false,
      openedSettings: opened,
      message:
        "In Location, select “Allow all the time”, then return to Kavya Field."
    };
  }

  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    trackingDevLog("background_permission", bg.status);
    if (bg.status === "granted") {
      return { ok: true };
    }
    const opened = await openLocationPermissionSettings();
    return {
      ok: false,
      openedSettings: opened,
      message: "Select “Allow all the time” for location, then return here."
    };
  } catch {
    const opened = await openLocationPermissionSettings();
    return {
      ok: false,
      openedSettings: opened,
      message: "Open Location settings and choose “Allow all the time”."
    };
  }
}

/** Open app location settings (precise / allow all the time). */
export async function openPreciseLocationSettings(): Promise<StepActionResult> {
  const opened = await openLocationPermissionSettings();
  return {
    ok: false,
    openedSettings: opened,
    message: "Keep Precise Location ON, then return to Kavya Field."
  };
}

/** Step 3 — battery optimization guidance. */
export async function runBatteryStep(): Promise<StepActionResult> {
  const opened = await openBatteryOptimizationSettings();
  await markBatteryGuidedCompleted();
  return {
    ok: true,
    openedSettings: opened,
    message: "Allow Kavya Field to run in the background, then return here."
  };
}

/** Step 4 — OEM guidance. */
export async function runOemStep(): Promise<StepActionResult> {
  const opened = await openOemOrAppSettings();
  await markOemGuidedCompleted();
  return {
    ok: true,
    openedSettings: opened,
    message: "Apply the battery tips for your phone, then return here."
  };
}

/** Step 5 — notifications (API 33+). */
export async function runNotificationStep(): Promise<StepActionResult> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.status === "granted") {
      return { ok: true };
    }
    const requested = await Notifications.requestPermissionsAsync();
    if (requested.granted || requested.status === "granted") {
      return { ok: true };
    }
    const opened = await openAppSettingsPage();
    return {
      ok: false,
      openedSettings: opened,
      message: "Allow notifications so the tracking notice can appear."
    };
  } catch {
    return { ok: true, message: "Notifications could not be checked on this device." };
  }
}

export async function finalizeSetupIfReady(): Promise<boolean> {
  const probe = await probeFieldTrackingPermissions();
  if (!isCriticalSetupReady(probe)) {
    return false;
  }
  // Never mark complete on temporary FG-only grants (Android "Only this time") —
  // critical readiness already requires lasting background except Expo Go.
  if (!probe.expoGoLimited && !probe.backgroundGranted) {
    return false;
  }
  await markFieldTrackingSetupCompleted();
  return true;
}

export async function openSettingsForMissing(step: "foreground" | "background" | "precise" | "notifications" | "battery") {
  if (step === "battery") return openBatteryOptimizationSettings();
  if (step === "notifications") return openAppSettingsPage();
  return openLocationPermissionSettings();
}
