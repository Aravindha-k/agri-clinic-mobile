/**
 * Canonical Field Tracking location permission API.
 *
 * Rules:
 * - Screens may silently probe at any time.
 * - Only Field Tracking Setup Continue / Fix actions may show OS permission dialogs.
 * - Never open Settings without an explicit employee tap.
 * - Never throw from probes; never crash startup.
 */
import { Alert } from "react-native";
import * as Location from "expo-location";
import { navigateRoot } from "../../navigation/rootNavigationRef";
import { readLocationServicesEnabled } from "../../utils/locationServicesProbe";
import {
  runBackgroundLocationStep,
  runForegroundLocationStep,
  openPreciseLocationSettings
} from "./actions";
import { ensureForegroundLocationPermission } from "./ensureForegroundLocation";
import {
  getFieldTrackingHealth,
  listMissingCriticalSteps,
  probeFieldTrackingPermissions
} from "./probe";
import { openLocationPermissionSettings, openAppSettingsPage } from "./settingsIntents";
import { syncFieldTrackingPermissionSnapshot } from "./persistence";
import type { FieldTrackingHealth, FieldTrackingProbe, SetupStepId } from "./types";
import {
  logLocationPermission,
  recoveryCopyForState,
  type LocationIssueState,
  type LocationRecoveryAction
} from "./locationStates";

const PROMPT_COOLDOWN_MS = 4_000;
let lastPromptAt = 0;
let promptVisible = false;

export type LocationReadinessProbe = {
  state: LocationIssueState;
  readyForWorkday: boolean;
  readyForVisit: boolean;
  servicesEnabled: boolean;
  foregroundGranted: boolean;
  preciseOk: boolean;
  backgroundGranted: boolean;
  /** Temporary FG grant without lasting BG — do not treat as setup complete. */
  temporaryForegroundLikely: boolean;
  canAskAgain: boolean | null;
  missing: SetupStepId[];
  probe: FieldTrackingProbe;
  health: FieldTrackingHealth;
  message?: string;
};

export type LocationReadyResult =
  | { ok: true; readiness: LocationReadinessProbe; state: "ready" }
  | {
      ok: false;
      state: LocationIssueState;
      reason: LocationIssueState;
      missing: SetupStepId[];
      message: string;
      readiness: LocationReadinessProbe;
    };

async function readForegroundAskAgain(): Promise<{
  granted: boolean;
  canAskAgain: boolean | null;
  status: string;
}> {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    return {
      granted: fg.status === "granted",
      canAskAgain: typeof fg.canAskAgain === "boolean" ? fg.canAskAgain : null,
      status: fg.status
    };
  } catch {
    return { granted: false, canAskAgain: null, status: "unknown" };
  }
}

function classifyIssue(input: {
  servicesEnabled: boolean;
  foregroundGranted: boolean;
  preciseOk: boolean;
  backgroundGranted: boolean;
  expoGoLimited: boolean;
  notificationsRequired: boolean;
  notificationsGranted: boolean;
  canAskAgain: boolean | null;
  forWorkday: boolean;
}): LocationIssueState {
  if (!input.servicesEnabled) return "location_services_disabled";
  if (!input.foregroundGranted) {
    if (input.canAskAgain === false) return "foreground_permission_blocked";
    if (input.canAskAgain === true) return "foreground_permission_denied";
    return "foreground_permission_missing";
  }
  if (!input.preciseOk) return "precise_location_disabled";
  // Background / notification are not required for current foreground field tracking.
  return "ready";
}

/**
 * Silent readiness probe — never requests permission or opens Settings.
 * Never throws. Persists a permission snapshot (Android remains authoritative).
 */
export async function probeLocationReadiness(): Promise<LocationReadinessProbe> {
  try {
    const servicesEnabled = await readLocationServicesEnabled().catch(() => false);
    const health = await getFieldTrackingHealth().catch(async () => {
      const probe = await probeFieldTrackingPermissions().catch(
        (): FieldTrackingProbe => ({
          foregroundGranted: false,
          backgroundGranted: false,
          preciseOk: false,
          notificationsGranted: false,
          notificationsRequired: false,
          batteryUnrestricted: null,
          oemGuidedDone: false,
          batteryGuidedDone: false,
          expoGoLimited: false,
          apiLevel: null,
          manufacturerFamily: "unknown"
        })
      );
      return {
        ready: false,
        missing: listMissingCriticalSteps(probe),
        probe,
        setupCompleted: false
      } satisfies FieldTrackingHealth;
    });
    const { probe } = health;
    const missing = listMissingCriticalSteps(probe);
    const fgMeta = await readForegroundAskAgain();

    const temporaryForegroundLikely = false;

    await syncFieldTrackingPermissionSnapshot({
      foregroundGranted: probe.foregroundGranted,
      preciseLocationConfirmed: probe.preciseOk,
      backgroundGranted: probe.backgroundGranted,
      notificationGranted: probe.notificationsGranted,
      temporaryForegroundLikely
    }).catch(() => undefined);

    const readyForVisit = servicesEnabled && probe.foregroundGranted && probe.preciseOk;
    const readyForWorkday = servicesEnabled && probe.foregroundGranted && probe.preciseOk;

    let state: LocationIssueState = "ready";
    if (!readyForWorkday) {
      state = classifyIssue({
        servicesEnabled,
        foregroundGranted: probe.foregroundGranted,
        preciseOk: probe.preciseOk,
        backgroundGranted: probe.backgroundGranted,
        expoGoLimited: probe.expoGoLimited,
        notificationsRequired: probe.notificationsRequired,
        notificationsGranted: probe.notificationsGranted,
        canAskAgain: fgMeta.canAskAgain,
        forWorkday: true
      });
      // Expo Go without FG: still classify as permission/services issue, not "unsupported".
      if (state === "unsupported_in_expo_go" && !probe.foregroundGranted) {
        state = "foreground_permission_missing";
      }
    }

    const copy = recoveryCopyForState(state === "ready" ? "ready" : state);

    logLocationPermission("probe_result", {
      state: readyForWorkday ? "ready" : state,
      readyForWorkday,
      readyForVisit,
      expoGoLimited: probe.expoGoLimited
    });
    if (readyForWorkday) {
      logLocationPermission("ready", { scope: "workday" });
    }

    return {
      state: readyForWorkday ? "ready" : state,
      readyForWorkday,
      readyForVisit,
      servicesEnabled,
      foregroundGranted: probe.foregroundGranted,
      preciseOk: probe.preciseOk,
      backgroundGranted: probe.backgroundGranted,
      temporaryForegroundLikely,
      canAskAgain: fgMeta.canAskAgain,
      missing: readyForWorkday ? [] : missing.length ? missing : listMissingCriticalSteps(probe),
      probe,
      health,
      message: readyForWorkday ? undefined : copy.message
    };
  } catch (err) {
    logLocationPermission("probe_result", {
      state: "unknown_error",
      error: err instanceof Error ? err.message : "probe_failed"
    });
    const emptyProbe: FieldTrackingProbe = {
      foregroundGranted: false,
      backgroundGranted: false,
      preciseOk: false,
      notificationsGranted: false,
      notificationsRequired: false,
      batteryUnrestricted: null,
      oemGuidedDone: false,
      batteryGuidedDone: false,
      expoGoLimited: false,
      apiLevel: null,
      manufacturerFamily: "unknown"
    };
    const health: FieldTrackingHealth = {
      ready: false,
      missing: ["foreground"],
      probe: emptyProbe,
      setupCompleted: false
    };
    return {
      state: "unknown_error",
      readyForWorkday: false,
      readyForVisit: false,
      servicesEnabled: false,
      foregroundGranted: false,
      preciseOk: false,
      backgroundGranted: false,
      temporaryForegroundLikely: false,
      canAskAgain: null,
      missing: ["foreground"],
      probe: emptyProbe,
      health,
      message: recoveryCopyForState("unknown_error").message
    };
  }
}

function failResult(
  readiness: LocationReadinessProbe,
  state: LocationIssueState
): LocationReadyResult & { ok: false } {
  const copy = recoveryCopyForState(state);
  return {
    ok: false,
    state,
    reason: state,
    missing: readiness.missing,
    message: copy.message,
    readiness: { ...readiness, state, message: copy.message }
  };
}

/** Silent check before Start Workday. Never throws. */
export async function ensureLocationReadyForWorkday(): Promise<LocationReadyResult> {
  const readiness = await probeLocationReadiness();
  if (readiness.readyForWorkday) {
    return { ok: true, readiness, state: "ready" };
  }
  return failResult(readiness, readiness.state === "ready" ? "temporarily_unavailable" : readiness.state);
}

/**
 * Silent check before New Visit / GPS capture.
 * Never throws. Background not required for visit capture.
 */
export async function ensureLocationReadyForVisit(): Promise<LocationReadyResult> {
  const readiness = await probeLocationReadiness();
  if (readiness.readyForVisit) {
    return { ok: true, readiness, state: "ready" };
  }
  const visitState = classifyIssue({
    servicesEnabled: readiness.servicesEnabled,
    foregroundGranted: readiness.foregroundGranted,
    preciseOk: readiness.preciseOk,
    backgroundGranted: readiness.backgroundGranted,
    expoGoLimited: readiness.probe.expoGoLimited,
    notificationsRequired: false,
    notificationsGranted: true,
    canAskAgain: readiness.canAskAgain,
    forWorkday: false
  });
  return failResult({ ...readiness, state: visitState }, visitState);
}

/** Open app location settings — only call after an explicit tap. */
export async function openLocationSettings(): Promise<boolean> {
  logLocationPermission("settings_opened", { target: "location" });
  return openLocationPermissionSettings().catch(() => openAppSettingsPage());
}

export async function requestForegroundLocation() {
  logLocationPermission("request_started", { kind: "foreground" });
  const result = await runForegroundLocationStep();
  if (!result.ok) logLocationPermission("request_denied", { kind: "foreground" });
  return result;
}

/** Workday-scoped — requests background location after disclosure (not at app launch). */
export async function requestBackgroundLocation() {
  logLocationPermission("request_started", { kind: "background" });
  const result = await runBackgroundLocationStep();
  if (!result.ok) logLocationPermission("request_denied", { kind: "background" });
  return result;
}

export { ensureForegroundLocationPermission };

export async function requestPreciseLocationFix() {
  logLocationPermission("settings_opened", { target: "precise" });
  return openPreciseLocationSettings();
}

export function openFieldTrackingFix(missing: SetupStepId[] = []): boolean {
  const focusMissing = missing.length ? missing : undefined;
  return navigateRoot("FieldTrackingSetup", focusMissing ? { focusMissing } : undefined);
}

async function runRecoveryAction(
  action: LocationRecoveryAction,
  result: LocationReadyResult & { ok: false },
  callbacks?: { onRetry?: () => void; onGoBack?: () => void; onCancel?: () => void }
): Promise<void> {
  switch (action) {
    case "allow_location": {
      logLocationPermission("request_started", { kind: "foreground", via: "recovery_allow" });
      const fg = await runForegroundLocationStep();
      if (fg.ok) {
        callbacks?.onRetry?.();
      } else if (fg.permanentlyDenied) {
        await openAppSettingsPage().catch(() => undefined);
      } else {
        callbacks?.onRetry?.();
      }
      break;
    }
    case "open_settings":
      logLocationPermission("settings_opened", { state: result.state });
      if (result.state === "precise_location_disabled") {
        await openPreciseLocationSettings().catch(() => openAppSettingsPage());
      } else if (result.state === "background_permission_missing") {
        await openLocationSettings();
      } else {
        await openLocationSettings();
      }
      break;
    case "open_app_settings":
      logLocationPermission("settings_opened", { target: "app" });
      await openAppSettingsPage().catch(() => undefined);
      break;
    case "turn_on_location": {
      logLocationPermission("settings_opened", { target: "location_services" });
      const { openDeviceLocationSettings } = await import("../../utils/workdayLocationGate");
      await openDeviceLocationSettings().catch(() => openAppSettingsPage());
      break;
    }
    case "retry":
      callbacks?.onRetry?.();
      break;
    case "go_back":
      callbacks?.onGoBack?.();
      break;
    case "not_now":
    case "cancel":
      logLocationPermission("prompt_cancelled", { state: result.state });
      callbacks?.onCancel?.();
      break;
  }
}

/**
 * Safe recovery UI for a classified location failure.
 * Cooldown + single-prompt guard prevent request loops.
 * Cancel never clears auth or visit draft.
 */
export function promptFixLocationAccess(
  result: LocationReadyResult & { ok: false },
  options?: {
    title?: string;
    onRetry?: () => void;
    onGoBack?: () => void;
    onCancel?: () => void;
  }
): void {
  try {
    const now = Date.now();
    if (promptVisible || now - lastPromptAt < PROMPT_COOLDOWN_MS) {
      logLocationPermission("prompt_suppressed_cooldown", { state: result.state });
      return;
    }
    lastPromptAt = now;
    promptVisible = true;

    const copy = recoveryCopyForState(result.state);
    const title = options?.title || copy.title;

    Alert.alert(title, copy.message, [
      {
        text: copy.secondary.label,
        style: "cancel",
        onPress: () => {
          promptVisible = false;
          void runRecoveryAction(copy.secondary.action, result, options);
        }
      },
      {
        text: copy.primary.label,
        onPress: () => {
          promptVisible = false;
          void runRecoveryAction(copy.primary.action, result, options);
        }
      }
    ]);
  } catch {
    promptVisible = false;
  }
}

/** Call after AppState active — recheck once, never auto-open Settings. */
export async function recheckLocationAfterSettingsReturn(): Promise<LocationReadinessProbe> {
  logLocationPermission("app_resumed_recheck");
  return probeLocationReadiness();
}

export { openAppSettingsPage };
export type { LocationIssueState };
