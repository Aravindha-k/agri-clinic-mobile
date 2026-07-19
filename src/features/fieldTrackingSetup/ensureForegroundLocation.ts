/**
 * Canonical single-flight foreground location permission.
 * Always reads live Android/iOS permission state — never trusts persisted flags.
 * Never opens Settings automatically.
 */
import * as Location from "expo-location";
import { ensureAndroidLocationServicesEnabled } from "../../utils/ensureAndroidLocationServices";

export type ForegroundLocationPermissionResult = {
  granted: boolean;
  permanentlyDenied: boolean;
  canAskAgain: boolean;
  status: string;
  /** True when this call showed the OS permission dialog. */
  didRequest: boolean;
};

export type EnableLocationFlowResult = {
  ok: boolean;
  permission: ForegroundLocationPermissionResult;
  servicesEnabled: boolean;
  permanentlyDenied: boolean;
  /** Services off after permission grant — distinct from permission denial. */
  servicesDisabled: boolean;
  message?: string;
};

export const PERMANENTLY_DENIED_MESSAGE =
  "Location permission is disabled. Enable it from app settings to use field tracking.";

export const RETRY_PERMISSION_MESSAGE =
  "Choose “While using the app” and allow Precise location when asked.";

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

/**
 * Check / request foreground location only.
 * Concurrent callers share one OS dialog.
 */
export async function ensureForegroundLocationPermission(): Promise<ForegroundLocationPermissionResult> {
  if (permissionInFlight) {
    return permissionInFlight;
  }

  permissionInFlight = (async (): Promise<ForegroundLocationPermissionResult> => {
    try {
      const current = await Location.getForegroundPermissionsAsync();

      if (isGranted(current)) {
        return {
          granted: true,
          permanentlyDenied: false,
          canAskAgain: true,
          status: current.status,
          didRequest: false
        };
      }

      // Only block the system dialog when Android truly cannot ask again.
      if (isPermanentlyDenied(current)) {
        return {
          granted: false,
          permanentlyDenied: true,
          canAskAgain: false,
          status: current.status,
          didRequest: false
        };
      }

      // undetermined OR denied with canAskAgain true/undefined → always request.
      const requested = await Location.requestForegroundPermissionsAsync();
      if (isGranted(requested)) {
        return {
          granted: true,
          permanentlyDenied: false,
          canAskAgain: true,
          status: requested.status,
          didRequest: true
        };
      }

      const permanentlyDenied = isPermanentlyDenied(requested);
      return {
        granted: false,
        permanentlyDenied,
        canAskAgain: requested.canAskAgain !== false && !permanentlyDenied,
        status: requested.status,
        didRequest: true
      };
    } catch {
      return {
        granted: false,
        permanentlyDenied: false,
        canAskAgain: true,
        status: "error",
        didRequest: false
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
        message: permission.permanentlyDenied ? PERMANENTLY_DENIED_MESSAGE : RETRY_PERMISSION_MESSAGE
      };
    }

    // Re-read live permission after the dialog before continuing.
    const recheck = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (recheck && !isGranted(recheck)) {
      const permanentlyDenied = isPermanentlyDenied(recheck);
      return {
        ok: false,
        permission: {
          granted: false,
          permanentlyDenied,
          canAskAgain: !permanentlyDenied,
          status: recheck.status,
          didRequest: permission.didRequest
        },
        servicesEnabled: false,
        permanentlyDenied,
        servicesDisabled: false,
        message: permanentlyDenied ? PERMANENTLY_DENIED_MESSAGE : RETRY_PERMISSION_MESSAGE
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
          permission: { ...permission, granted: true },
          servicesEnabled: false,
          permanentlyDenied: false,
          servicesDisabled: true,
          message: SERVICES_OFF_MESSAGE
        };
      }
    }

    return {
      ok: true,
      permission: {
        ...permission,
        granted: true,
        status: recheck?.status ?? permission.status
      },
      servicesEnabled: true,
      permanentlyDenied: false,
      servicesDisabled: false
    };
  })();

  try {
    return await enableFlowInFlight;
  } finally {
    enableFlowInFlight = null;
  }
}
