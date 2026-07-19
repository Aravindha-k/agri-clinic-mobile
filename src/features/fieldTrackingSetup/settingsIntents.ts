import { Linking, Platform } from "react-native";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import { detectManufacturerFamily } from "./manufacturer";

function appPackageName(): string {
  return Constants.expoConfig?.android?.package || "com.kavya.agriclinic";
}

async function tryIntent(
  action: string,
  extras?: { data?: string; category?: string; packageName?: string }
): Promise<boolean> {
  try {
    await IntentLauncher.startActivityAsync(action, extras);
    return true;
  } catch {
    return false;
  }
}

async function openAppDetailsFallback(): Promise<boolean> {
  if (Platform.OS === "android") {
    const opened = await tryIntent(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
      data: `package:${appPackageName()}`
    });
    if (opened) return true;
  }
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}

/** Open app-specific settings (Permissions → Location lives here). */
export async function openAppSettingsPage(): Promise<boolean> {
  return openAppDetailsFallback();
}

/**
 * Open the app details page where employees set Location → Allow all the time.
 * Never asks them to search for the app in the system settings list.
 */
export async function openLocationPermissionSettings(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return openAppDetailsFallback();
  }
  const opened = await tryIntent(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
    data: `package:${appPackageName()}`
  });
  if (opened) return true;
  return openAppDetailsFallback();
}

/**
 * Request battery-optimization exemption (employee must approve).
 * Falls back to battery / app details settings.
 */
export async function openBatteryOptimizationSettings(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return openAppDetailsFallback();
  }

  const pkg = appPackageName();

  if (
    await tryIntent(IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, {
      data: `package:${pkg}`
    })
  ) {
    return true;
  }

  if (await tryIntent(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) {
    return true;
  }

  if (
    await tryIntent(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
      data: `package:${pkg}`
    })
  ) {
    return true;
  }

  return openAppDetailsFallback();
}

/**
 * Best-effort OEM / battery page for manufacturer guidance.
 * Unsupported OEM intents fall back safely — never throws.
 */
export async function openOemOrAppSettings(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return openAppDetailsFallback();
  }

  const family = detectManufacturerFamily();
  const pkg = appPackageName();

  // Best-effort OEM activity names. Failures fall through — never crash.
  const oemAttempts: Array<{ action: string; packageName?: string }> = [];

  if (family === "xiaomi") {
    oemAttempts.push(
      { action: "miui.intent.action.POWER_HIDE_MODE_APP_LIST", packageName: "com.miui.securitycenter" },
      { action: "miui.intent.action.OP_AUTO_START", packageName: "com.miui.securitycenter" }
    );
  } else if (family === "oppo" || family === "realme") {
    oemAttempts.push(
      { action: "android.settings.APPLICATION_DETAILS_SETTINGS" },
      { action: "coloros.intent.action.OP_AUTO_START", packageName: "com.coloros.safecenter" }
    );
  } else if (family === "vivo") {
    oemAttempts.push({
      action: "android.settings.APPLICATION_DETAILS_SETTINGS"
    });
  } else if (family === "samsung") {
    oemAttempts.push({
      action: IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
    });
  }

  for (const attempt of oemAttempts) {
    const extras: { data?: string; packageName?: string } = {};
    if (attempt.packageName) extras.packageName = attempt.packageName;
    if (attempt.action.includes("APPLICATION_DETAILS")) {
      extras.data = `package:${pkg}`;
    }
    if (await tryIntent(attempt.action, extras)) {
      return true;
    }
  }

  return openBatteryOptimizationSettings();
}
