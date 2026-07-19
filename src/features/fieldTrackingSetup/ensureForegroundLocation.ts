/**
 * Canonical single-flight foreground location permission.
 * Only call from an explicit employee action (Enable Location / Start Workday / Retry).
 * Never opens Settings automatically.
 */
import * as Location from "expo-location";
import { ensureAndroidLocationServicesEnabled } from "../../utils/ensureAndroidLocationServices";
import { readLocationServicesEnabled } from "../../utils/locationServicesProbe";

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
  message?: string;
};

const PERMANENTLY_DENIED_MESSAGE =
  "Location permission is disabled. Enable it from app settings to use field tracking.";

let permissionInFlight: Promise<ForegroundLocationPermissionResult> | null = null;
let enableFlowInFlight: Promise<EnableLocationFlowResult> | null = null;

/**
 * Check / request foreground precise location only.
 * Concurrent callers share one OS dialog.
 */
export async function ensureForegroundLocationPermission(): Promise<ForegroundLocationPermissionResult> {
  if (permissionInFlight) {
    return permissionInFlight;
  }

  permissionInFlight = (async (): Promise<ForegroundLocationPermissionResult> => {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status === "granted") {
        return {
          granted: true,
          permanentlyDenied: false,
          canAskAgain: true,
          status: current.status,
          didRequest: false
        };
      }

      const canAskAgain = current.canAskAgain !== false;
      if (!canAskAgain) {
        return {
          granted: false,
          permanentlyDenied: true,
          canAskAgain: false,
          status: current.status,
          didRequest: false
        };
      }

      const requested = await Location.requestForegroundPermissionsAsync();
      const granted = requested.status === "granted";
      const stillCanAsk = requested.canAskAgain !== false;
      return {
        granted,
        permanentlyDenied: !granted && !stillCanAsk,
        canAskAgain: stillCanAsk,
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

/**
 * One-tap Enable Location: foreground permission → device GPS prompt if needed → ready.
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
        servicesEnabled: await readLocationServicesEnabled().catch(() => false),
        permanentlyDenied: permission.permanentlyDenied,
        message: permission.permanentlyDenied
          ? PERMANENTLY_DENIED_MESSAGE
          : "Choose “While using the app” and allow Precise location when asked."
      };
    }

    let servicesEnabled = await readLocationServicesEnabled().catch(() => false);
    if (!servicesEnabled) {
      const services = await ensureAndroidLocationServicesEnabled();
      servicesEnabled =
        services.status === "enabled" || services.status === "enabled_by_user"
          ? true
          : await readLocationServicesEnabled().catch(() => false);
      if (!servicesEnabled) {
        return {
          ok: false,
          permission,
          servicesEnabled: false,
          permanentlyDenied: false,
          message: "Turn on phone location to continue field tracking."
        };
      }
    }

    // Re-check permission after the flow so UI state stays fresh.
    const recheck = await Location.getForegroundPermissionsAsync().catch(() => null);
    const stillGranted = recheck ? recheck.status === "granted" : permission.granted;

    return {
      ok: stillGranted && servicesEnabled,
      permission: {
        ...permission,
        granted: stillGranted,
        status: recheck?.status ?? permission.status
      },
      servicesEnabled,
      permanentlyDenied: false
    };
  })();

  try {
    return await enableFlowInFlight;
  } finally {
    enableFlowInFlight = null;
  }
}

export { PERMANENTLY_DENIED_MESSAGE };
