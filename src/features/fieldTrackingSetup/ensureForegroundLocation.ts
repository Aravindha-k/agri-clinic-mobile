/**
 * Canonical single-flight foreground location permission.
 * Always reads live Android/iOS permission state — never trusts persisted flags.
 * Never opens Settings automatically.
 * Sole owner of Location.requestForegroundPermissionsAsync().
 */
import { Platform } from "react-native";
import * as Location from "expo-location";
import { ensureAndroidLocationServicesEnabled } from "../../utils/ensureAndroidLocationServices";

export type ForegroundLocationPermissionResult = {
  granted: boolean;
  permanentlyDenied: boolean;
  canAskAgain: boolean;
  status: string;
  /** True when this call showed the OS permission dialog. */
  didRequest: boolean;
  /** Android precise (fine) when granted; true on iOS / unknown APIs. */
  preciseOk: boolean;
};

export type EnableLocationFlowResult = {
  ok: boolean;
  permission: ForegroundLocationPermissionResult;
  servicesEnabled: boolean;
  permanentlyDenied: boolean;
  /** Services off after permission grant — distinct from permission denial. */
  servicesDisabled: boolean;
  /** Approximate-only after upgrade attempt — Settings only if OS cannot upgrade. */
  needsPreciseUpgrade: boolean;
  message?: string;
};

export const PERMANENTLY_DENIED_MESSAGE =
  "Location permission is disabled for Kavya Agri Clinic.";

export const RETRY_PERMISSION_MESSAGE =
  "Location is required to record field work.";

export const PRECISE_RETRY_MESSAGE =
  "Precise location is needed to record the correct field location.";

export const SERVICES_OFF_MESSAGE = "Turn on phone location to continue field tracking.";

let permissionInFlight: Promise<ForegroundLocationPermissionResult> | null = null;
let enableFlowInFlight: Promise<EnableLocationFlowResult> | null = null;

function isGranted(response: Location.LocationPermissionResponse): boolean {
  return response.granted === true || response.status === "granted";
}

/**
 * Permanently denied only when OS says denied AND canAskAgain === false.
 * Undetermined / first denial (canAskAgain true) must still show the system dialog.
 */
function isPermanentlyDenied(response: Location.LocationPermissionResponse): boolean {
  return response.granted !== true && response.status === "denied" && response.canAskAgain === false;
}

function readPreciseOk(response: Location.LocationPermissionResponse): boolean {
  if (!isGranted(response)) return false;
  if (Platform.OS !== "android") return true;
  const androidMeta = (response as { android?: { accuracy?: string } }).android;
  if (androidMeta?.accuracy === "coarse") return false;
  if (androidMeta?.accuracy === "fine") return true;
  // Older APIs / Expo Go — treat granted FG as sufficient.
  return true;
}

function toResult(
  response: Location.LocationPermissionResponse,
  didRequest: boolean
): ForegroundLocationPermissionResult {
  if (isGranted(response)) {
    return {
      granted: true,
      permanentlyDenied: false,
      canAskAgain: true,
      status: response.status,
      didRequest,
      preciseOk: readPreciseOk(response)
    };
  }
  const permanentlyDenied = isPermanentlyDenied(response);
  return {
    granted: false,
    permanentlyDenied,
    canAskAgain: response.canAskAgain !== false && !permanentlyDenied,
    status: response.status,
    didRequest,
    preciseOk: false
  };
}

/**
 * Check / request foreground location only.
 * Concurrent callers share one OS dialog.
 * When already granted approximate-only, re-requests once for Android precise upgrade.
 */
export async function ensureForegroundLocationPermission(): Promise<ForegroundLocationPermissionResult> {
  if (permissionInFlight) {
    return permissionInFlight;
  }

  permissionInFlight = (async (): Promise<ForegroundLocationPermissionResult> => {
    try {
      const current = await Location.getForegroundPermissionsAsync();

      if (isGranted(current)) {
        if (readPreciseOk(current)) {
          return toResult(current, false);
        }
        // Approximate only — Android may still allow a precise upgrade dialog.
        const upgraded = await Location.requestForegroundPermissionsAsync();
        return toResult(upgraded, true);
      }

      // Only block the system dialog when Android truly cannot ask again.
      if (isPermanentlyDenied(current)) {
        return toResult(current, false);
      }

      // undetermined OR denied with canAskAgain true/undefined → always request.
      const requested = await Location.requestForegroundPermissionsAsync();
      if (!isGranted(requested)) {
        return toResult(requested, true);
      }

      if (readPreciseOk(requested)) {
        return toResult(requested, true);
      }

      // Granted approximate — try one upgrade pass (same request API).
      const upgraded = await Location.requestForegroundPermissionsAsync();
      return toResult(upgraded, true);
    } catch {
      return {
        granted: false,
        permanentlyDenied: false,
        canAskAgain: true,
        status: "error",
        didRequest: false,
        preciseOk: false
      };
    }
  })();

  try {
    return await permissionInFlight;
  } finally {
    permissionInFlight = null;
  }
}

async function readServicesEnabled(): Promise<boolean> {
  try {
    if (typeof Location.hasServicesEnabledAsync === "function") {
      return await Location.hasServicesEnabledAsync();
    }
  } catch {
    // fall through
  }
  try {
    const { readLocationServicesEnabled } = await import("../../utils/locationServicesProbe");
    return await readLocationServicesEnabled();
  } catch {
    return false;
  }
}

/**
 * One-tap Enable Location: live permission check → native dialog if needed → GPS services.
 * Does not open App Info / Installed App Settings.
 */
export async function enableLocationForFieldWork(): Promise<EnableLocationFlowResult> {
  if (enableFlowInFlight) {
    return enableFlowInFlight;
  }

  enableFlowInFlight = (async (): Promise<EnableLocationFlowResult> => {
    const permission = await ensureForegroundLocationPermission();

    if (!permission.granted) {
      return {
        ok: false,
        permission,
        servicesEnabled: false,
        permanentlyDenied: permission.permanentlyDenied,
        servicesDisabled: false,
        needsPreciseUpgrade: false,
        message: permission.permanentlyDenied ? PERMANENTLY_DENIED_MESSAGE : RETRY_PERMISSION_MESSAGE
      };
    }

    // Re-read live permission after the dialog before continuing.
    const recheck = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (recheck && !isGranted(recheck)) {
      const permanentlyDenied = isPermanentlyDenied(recheck);
      return {
        ok: false,
        permission: toResult(recheck, permission.didRequest),
        servicesEnabled: false,
        permanentlyDenied,
        servicesDisabled: false,
        needsPreciseUpgrade: false,
        message: permanentlyDenied ? PERMANENTLY_DENIED_MESSAGE : RETRY_PERMISSION_MESSAGE
      };
    }

    const live = recheck ?? null;
    const preciseOk = live ? readPreciseOk(live) : permission.preciseOk;
    if (!preciseOk) {
      return {
        ok: false,
        permission: {
          ...permission,
          granted: true,
          preciseOk: false,
          status: live?.status ?? permission.status
        },
        servicesEnabled: false,
        permanentlyDenied: false,
        servicesDisabled: false,
        needsPreciseUpgrade: true,
        message: PRECISE_RETRY_MESSAGE
      };
    }

    let servicesEnabled = await readServicesEnabled();
    if (!servicesEnabled) {
      const services = await ensureAndroidLocationServicesEnabled();
      servicesEnabled =
        services.status === "enabled" || services.status === "enabled_by_user"
          ? true
          : await readServicesEnabled();
      if (!servicesEnabled) {
        return {
          ok: false,
          permission: { ...permission, granted: true, preciseOk: true },
          servicesEnabled: false,
          permanentlyDenied: false,
          servicesDisabled: true,
          needsPreciseUpgrade: false,
          message: SERVICES_OFF_MESSAGE
        };
      }
    }

    return {
      ok: true,
      permission: {
        ...permission,
        granted: true,
        preciseOk: true,
        status: live?.status ?? permission.status
      },
      servicesEnabled: true,
      permanentlyDenied: false,
      servicesDisabled: false,
      needsPreciseUpgrade: false
    };
  })();

  try {
    return await enableFlowInFlight;
  } finally {
    enableFlowInFlight = null;
  }
}
