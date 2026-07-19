/**
 * Single startup lifecycle coordinator.
 * Owns phase transitions, timeout constants, and structured startup events.
 * Does not own splash animation visuals (KavyaCinematicSplash remains sole animation owner).
 */
import { logStartup, logStartupError, patchStartupSnapshot } from "../utils/startupDiagnostics";

export const STARTUP_TIMEOUTS = {
  fontsMs: 4000,
  secureStoreReadMs: 2500,
  /**
   * @deprecated Do not use for dynamic-import / Metro bundling.
   * Kept as an alias of criticalBootstrapMs for older call sites.
   * Module bundling delay must never be treated as a fatal startup failure.
   */
  providersModuleMs: 12000,
  /** Post-module bootstrap (fonts + local auth). Starts only after providers are mounted. */
  criticalBootstrapMs: 12000,
  authLocalMs: 6000,
  bootstrapNetworkMs: 12000,
  dutyHydrationMs: 8000,
  motionPreferenceMs: 2000,
  nativeSplashFailsafeMs: 8000,
  splashAbsoluteMs: 8000,
  biometricLookupMs: 2500,
  /** Dev-only soft warning while critical bootstrap is slow (never fatal). */
  devSlowBootstrapWarnMs: 20000
} as const;

export type StartupCoordinatorPhase =
  | "startup_begin"
  | "fonts_loaded"
  | "assets_loaded"
  | "auth_restored"
  | "bootstrap_begin"
  | "bootstrap_success"
  | "bootstrap_timeout"
  | "bootstrap_failed"
  | "duty_ready"
  | "startup_complete"
  | "startup_failed"
  | "continue_offline";

type StartupCoordinatorState = {
  phase: StartupCoordinatorPhase;
  continueOffline: boolean;
  failedStep: string | null;
  startedAt: number;
};

let state: StartupCoordinatorState = {
  phase: "startup_begin",
  continueOffline: false,
  failedStep: null,
  startedAt: Date.now()
};

/** Terminal success — stale timers must not overwrite with startup_error. */
let startupSucceeded = false;

const listeners = new Set<(next: StartupCoordinatorState) => void>();

function emit(next: Partial<StartupCoordinatorState>, logPhase?: StartupCoordinatorPhase, detail?: string) {
  if (startupSucceeded && (logPhase === "startup_failed" || logPhase === "bootstrap_failed")) {
    return;
  }
  state = { ...state, ...next };
  if (logPhase) {
    state.phase = logPhase;
    if (logPhase === "startup_failed" || logPhase === "bootstrap_failed") {
      logStartupError(detail ?? logPhase);
    } else {
      logStartup(logPhase as Parameters<typeof logStartup>[0], detail);
    }
  }
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      // ignore listener failures so one subscriber cannot block startup
    }
  }
}

export function getStartupCoordinatorState(): Readonly<StartupCoordinatorState> {
  return state;
}

export function subscribeStartupCoordinator(listener: (next: StartupCoordinatorState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markStartupBegin(detail?: string) {
  startupSucceeded = false;
  state = {
    phase: "startup_begin",
    continueOffline: false,
    failedStep: null,
    startedAt: Date.now()
  };
  logStartup("startup_begin" as Parameters<typeof logStartup>[0], detail);
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      // ignore
    }
  }
}

export function markFontsLoaded(detail?: string) {
  emit({}, "fonts_loaded", detail);
  patchStartupSnapshot({ fontsLoaded: true });
}

export function markAssetsLoaded(detail?: string) {
  emit({}, "assets_loaded", detail);
}

export function markAuthRestored(detail?: string) {
  emit({}, "auth_restored", detail);
  patchStartupSnapshot({ isReady: true });
}

export function markBootstrapBegin(detail?: string) {
  emit({}, "bootstrap_begin", detail);
}

export function markBootstrapSuccess(detail?: string) {
  emit({}, "bootstrap_success", detail);
}

export function markBootstrapTimeout(detail?: string) {
  emit({ failedStep: "bootstrap" }, "bootstrap_timeout", detail);
}

export function markBootstrapFailed(detail?: string) {
  emit({ failedStep: "bootstrap" }, "bootstrap_failed", detail);
}

export function markDutyReady(detail?: string) {
  emit({}, "duty_ready", detail);
}

export function markStartupComplete(detail?: string) {
  startupSucceeded = true;
  emit({ failedStep: null }, "startup_complete", detail);
}

export function markStartupFailed(step: string, detail?: string) {
  if (startupSucceeded) {
    return;
  }
  emit({ failedStep: step }, "startup_failed", detail ?? step);
}

export function hasStartupCompleted(): boolean {
  return startupSucceeded;
}

export function markContinueOffline(detail?: string) {
  emit({ continueOffline: true, failedStep: null }, "continue_offline", detail);
}

export function clearContinueOffline() {
  state = { ...state, continueOffline: false };
}

export function isStartupContinueOffline(): boolean {
  return state.continueOffline;
}

export function resetStartupCoordinator() {
  startupSucceeded = false;
  state = {
    phase: "startup_begin",
    continueOffline: false,
    failedStep: null,
    startedAt: Date.now()
  };
}
