/**
 * Canonical location readiness gate for Start Work Day and related field actions.
 *
 * Owns: foreground permission read/request, GPS services check/prompt,
 * permanent-denial handling, AppState resume, single-flight protection.
 * Never opens Settings automatically. Foreground location only.
 */
import { AppState, type AppStateStatus, Linking } from "react-native";
import * as Location from "expo-location";
import { ensureAndroidLocationServicesEnabled } from "../../utils/ensureAndroidLocationServices";
import {
  ensureForegroundLocationPermission,
  type ForegroundLocationPermissionResult
} from "./ensureForegroundLocation";
import { openAppSettingsPage } from "./settingsIntents";

export type LocationReadinessStatus =
  | "ready"
  | "permission_denied_retryable"
  | "permission_denied_permanent"
  | "services_disabled"
  | "cancelled"
  | "error";

export type LocationReadinessResult = {
  status: LocationReadinessStatus;
  message: string;
  permission?: ForegroundLocationPermissionResult;
  servicesEnabled?: boolean;
};

/** UI phase for Start Work Day button labels — no technical jargon. */
export type LocationGatePhase =
  | "idle"
  | "checking"
  | "allow_location"
  | "turn_on_location"
  | "starting"
  | "try_again"
  | "open_settings";

export const LOCATION_GATE_MESSAGES = {
  permissionRetry: "Location permission is required to start your workday.",
  permissionPermanent: "Location permission is disabled for this app.",
  servicesOff: "Turn on device location to start your workday.",
  servicesCancelled: "Location was not enabled. Try again.",
  error: "Could not check location. Please try again."
} as const;

type GateOptions = {
  onPhase?: (phase: LocationGatePhase) => void;
  /** When true, only read state — never request permission or GPS dialogs. */
  probeOnly?: boolean;
};

let readinessInFlight: Promise<LocationReadinessResult> | null = null;
let pendingStartWorkDay = false;
let pendingStartCallback: (() => Promise<void>) | null = null;
let appStateSub: { remove: () => void } | null = null;

function emitPhase(onPhase: GateOptions["onPhase"], phase: LocationGatePhase) {
  onPhase?.(phase);
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

function result(
  status: LocationReadinessStatus,
  message: string,
  extra?: Partial<LocationReadinessResult>
): LocationReadinessResult {
  return { status, message, ...extra };
}

/**
 * One canonical readiness sequence.
 * Live OS reads only — never trusts persisted permission flags.
 */
export async function ensureLocationReadyForAction(
  options: GateOptions = {}
): Promise<LocationReadinessResult> {
  if (readinessInFlight && !options.probeOnly) {
    return readinessInFlight;
  }

  const run = async (): Promise<LocationReadinessResult> => {
    const { onPhase, probeOnly = false } = options;
    try {
      emitPhase(onPhase, "checking");

      if (probeOnly) {
        const current = await Location.getForegroundPermissionsAsync();
        const granted = current.granted === true || current.status === "granted";
        if (!granted) {
          const permanent = current.status === "denied" && current.canAskAgain === false;
          emitPhase(onPhase, permanent ? "open_settings" : "try_again");
          return result(
            permanent ? "permission_denied_permanent" : "permission_denied_retryable",
            permanent
              ? LOCATION_GATE_MESSAGES.permissionPermanent
              : LOCATION_GATE_MESSAGES.permissionRetry,
            {
              permission: {
                granted: false,
                permanentlyDenied: permanent,
                canAskAgain: !permanent,
                status: current.status,
                didRequest: false
              },
              servicesEnabled: false
            }
          );
        }
        const servicesEnabled = await readServicesEnabled();
        if (!servicesEnabled) {
          emitPhase(onPhase, "try_again");
          return result("services_disabled", LOCATION_GATE_MESSAGES.servicesOff, {
            servicesEnabled: false
          });
        }
        emitPhase(onPhase, "idle");
        return result("ready", "", { servicesEnabled: true });
      }

      emitPhase(onPhase, "allow_location");
      const permission = await ensureForegroundLocationPermission();

      if (!permission.granted) {
        if (permission.permanentlyDenied) {
          emitPhase(onPhase, "open_settings");
          return result(
            "permission_denied_permanent",
            LOCATION_GATE_MESSAGES.permissionPermanent,
            { permission, servicesEnabled: false }
          );
        }
        emitPhase(onPhase, "try_again");
        return result(
          "permission_denied_retryable",
          LOCATION_GATE_MESSAGES.permissionRetry,
          { permission, servicesEnabled: false }
        );
      }

      // Re-read live permission after any dialog.
      const recheck = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (recheck && !(recheck.granted === true || recheck.status === "granted")) {
        const permanent = recheck.status === "denied" && recheck.canAskAgain === false;
        emitPhase(onPhase, permanent ? "open_settings" : "try_again");
        return result(
          permanent ? "permission_denied_permanent" : "permission_denied_retryable",
          permanent
            ? LOCATION_GATE_MESSAGES.permissionPermanent
            : LOCATION_GATE_MESSAGES.permissionRetry,
          {
            permission: {
              granted: false,
              permanentlyDenied: permanent,
              canAskAgain: !permanent,
              status: recheck.status,
              didRequest: permission.didRequest
            },
            servicesEnabled: false
          }
        );
      }

      emitPhase(onPhase, "turn_on_location");
      let servicesEnabled = await readServicesEnabled();
      if (!servicesEnabled) {
        const services = await ensureAndroidLocationServicesEnabled();
        if (services.status === "cancelled") {
          emitPhase(onPhase, "try_again");
          return result("cancelled", LOCATION_GATE_MESSAGES.servicesCancelled, {
            permission,
            servicesEnabled: false
          });
        }
        servicesEnabled =
          services.status === "enabled" || services.status === "enabled_by_user"
            ? true
            : await readServicesEnabled();
        if (!servicesEnabled) {
          emitPhase(onPhase, "try_again");
          return result(
            services.status === "error" ? "error" : "services_disabled",
            services.status === "error"
              ? LOCATION_GATE_MESSAGES.error
              : LOCATION_GATE_MESSAGES.servicesOff,
            { permission, servicesEnabled: false }
          );
        }
      }

      // Background ("all the time") + tracking notification — only at workday start,
      // after clear disclosure. Declining BG still allows start; FGS uses FG permission.
      const { ensureBackgroundLocationForWorkday } = await import("./ensureBackgroundLocation");
      await ensureBackgroundLocationForWorkday().catch(() => undefined);

      emitPhase(onPhase, "idle");
      return result("ready", "", {
        permission: { ...permission, granted: true },
        servicesEnabled: true
      });
    } catch {
      emitPhase(onPhase, "try_again");
      return result("error", LOCATION_GATE_MESSAGES.error);
    }
  };

  if (options.probeOnly) {
    return run();
  }

  readinessInFlight = run();
  try {
    return await readinessInFlight;
  } finally {
    readinessInFlight = null;
  }
}

export function isPendingStartWorkDay(): boolean {
  return pendingStartWorkDay;
}

export function clearPendingStartWorkDay(): void {
  pendingStartWorkDay = false;
  pendingStartCallback = null;
}

export function setPendingStartWorkDay(callback: () => Promise<void>): void {
  pendingStartWorkDay = true;
  pendingStartCallback = callback;
  ensureAppStateListener();
}

/**
 * Permanent denial only — Settings opens solely after an explicit tap.
 */
export async function openSettingsForPendingStartWorkDay(
  resumeCallback: () => Promise<void>
): Promise<void> {
  setPendingStartWorkDay(resumeCallback);
  try {
    await openAppSettingsPage();
  } catch {
    await Linking.openSettings().catch(() => undefined);
  }
}

async function handleAppStateChange(next: AppStateStatus): Promise<void> {
  if (next !== "active" || !pendingStartWorkDay || !pendingStartCallback) {
    return;
  }
  // Probe only — never auto-request permission or open Settings on resume.
  const readiness = await ensureLocationReadyForAction({ probeOnly: true });
  if (readiness.status !== "ready") {
    return;
  }
  const callback = pendingStartCallback;
  clearPendingStartWorkDay();
  try {
    await callback();
  } catch {
    // Caller owns error UI.
  }
}

function ensureAppStateListener(): void {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener("change", (state) => {
    void handleAppStateChange(state);
  });
}

/** Clear pending start on logout / session loss. */
export function installLocationGateAuthCleanup(
  subscribe: (handler: (phase: string) => void) => () => void
): () => void {
  ensureAppStateListener();
  return subscribe((phase) => {
    if (
      phase === "unauthenticated" ||
      phase === "locked" ||
      phase === "session_replaced"
    ) {
      clearPendingStartWorkDay();
    }
  });
}

export type StartWorkDayGateOutcome = {
  ok: boolean;
  readiness: LocationReadinessResult;
  duty: unknown | null;
};

/**
 * One-tap Start Work Day: location gate → startDuty automatically when ready.
 */
export async function startWorkDayWithLocationGate(options: {
  startDuty: () => Promise<unknown | null>;
  onPhase?: (phase: LocationGatePhase) => void;
}): Promise<StartWorkDayGateOutcome> {
  const readiness = await ensureLocationReadyForAction({ onPhase: options.onPhase });
  if (readiness.status !== "ready") {
    return { ok: false, readiness, duty: null };
  }

  emitPhase(options.onPhase, "starting");
  try {
    const duty = await options.startDuty();
    emitPhase(options.onPhase, "idle");
    if (!duty) {
      return {
        ok: false,
        readiness: result("error", "Could not start workday. Please try again."),
        duty: null
      };
    }
    clearPendingStartWorkDay();
    return { ok: true, readiness, duty };
  } catch {
    emitPhase(options.onPhase, "try_again");
    return {
      ok: false,
      readiness: result("error", LOCATION_GATE_MESSAGES.error),
      duty: null
    };
  }
}

/** Map gate phase → Start Work Day button label key under workdayUx. */
export function locationGatePhaseToLabelKey(phase: LocationGatePhase): string {
  switch (phase) {
    case "checking":
      return "checkingLocation";
    case "allow_location":
      return "allowLocation";
    case "turn_on_location":
      return "turnOnDeviceLocation";
    case "starting":
      return "startingWorkday";
    case "try_again":
      return "tryAgain";
    case "open_settings":
      return "openSettings";
    default:
      return "startWorkday";
  }
}
