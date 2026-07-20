import {
  API_BASE_URL,
  buildApiUrl,
  getApiBuildDiagnostics,
  getApiHostname,
  getProductionApiEndpoints
} from "../api/config";

export type StartupPhase =
  | "first_render"
  | "native_splash_hold"
  | "native_splash_hide_attempt"
  | "native_splash_hidden"
  | "cinematic_component_rendered"
  | "cinematic_mounted"
  | "cinematic_first_layout"
  | "splash_mode_locked"
  | "cinematic_animation_started"
  | "cinematic_ready"
  | "cinematic_exit_start"
  | "cinematic_exit_started"
  | "cinematic_finished"
  | "ring_rendered"
  | "ring_layout"
  | "ring_animation_started"
  | "ring_animation_stopped"
  | "providers_module_ready"
  | "providers_module_loading"
  | "providers_mounted"
  | "waiting_for_metro_bundle"
  | "bootstrapping"
  | "providers_ready"
  | "minimum_duration_complete"
  | "native_handoff"
  | "app_ready"
  | "app_revealed"
  | "startup_error"
  | "app_mount"
  | "fonts_loading"
  | "fonts_ready"
  | "fonts_timeout"
  | "tracking_task_deferred"
  | "auth_bootstrap_start"
  | "auth_bootstrap_end"
  | "auth_validate_background_start"
  | "auth_validate_background_end"
  | "auth_bootstrap_timeout"
  | "nav_login"
  | "nav_home"
  | "nav_error"
  | "nav_stuck_fallback"
  | "session_restored"
  | "session_cleared"
  | "session_locked"
  | "biometric_reconnected"
  | "password_login_chosen"
  | "splash_replay"
  | "splash_start"
  | "splash_end"
  | "splash_timeout"
  | "startup_begin"
  | "fonts_loaded"
  | "assets_loaded"
  | "auth_restored"
  | "bootstrap_begin"
  | "bootstrap_success"
  | "bootstrap_timeout"
  | "bootstrap_failed"
  | "duty_ready"
  | "duty_hydration_timeout"
  | "startup_complete"
  | "startup_failed"
  | "continue_offline";

export type StartupSnapshot = {
  releaseMode: boolean;
  apiBaseUrl: string;
  apiHostname: string;
  loginUrl: string;
  buildEnv: string;
  appVersion: string;
  gitCommit: string;
  fontsLoaded: boolean | null;
  authLoading: boolean | null;
  isReady: boolean | null;
  isAuthenticated: boolean | null;
  bootstrapIssue: string | null;
  introDone: boolean | null;
  splashExpired: boolean | null;
  lastPhase: StartupPhase | null;
  lastDetail: string | null;
  updatedAt: string;
  phases: Array<{ phase: StartupPhase; detail?: string; at: string }>;
};

const MAX_PHASE_LOG = 40;

const buildDiag = getApiBuildDiagnostics();

const snapshot: StartupSnapshot = {
  releaseMode: typeof __DEV__ !== "undefined" ? !__DEV__ : true,
  apiBaseUrl: API_BASE_URL,
  apiHostname: buildDiag.apiHostname,
  loginUrl: buildApiUrl("mobile/auth/login/", API_BASE_URL),
  buildEnv: buildDiag.buildEnv,
  appVersion: buildDiag.appVersion,
  gitCommit: buildDiag.gitCommit,
  fontsLoaded: null,
  authLoading: null,
  isReady: null,
  isAuthenticated: null,
  bootstrapIssue: null,
  introDone: null,
  splashExpired: null,
  lastPhase: null,
  lastDetail: null,
  updatedAt: new Date().toISOString(),
  phases: []
};

function touch() {
  const diag = getApiBuildDiagnostics();
  snapshot.updatedAt = new Date().toISOString();
  snapshot.releaseMode = !__DEV__;
  snapshot.apiBaseUrl = API_BASE_URL;
  snapshot.apiHostname = diag.apiHostname;
  snapshot.loginUrl = buildApiUrl("mobile/auth/login/", API_BASE_URL);
  snapshot.buildEnv = diag.buildEnv;
  snapshot.appVersion = diag.appVersion;
  snapshot.gitCommit = diag.gitCommit;
}

export function logStartupError(message: string) {
  touch();
  if (snapshot.lastPhase === "startup_complete") {
    console.warn(`[Startup] ignored_stale_error_after_complete ${message}`);
    return;
  }
  snapshot.lastPhase = "startup_error";
  snapshot.lastDetail = message;
  snapshot.phases.push({ phase: "startup_error", detail: message, at: new Date().toISOString() });
  if (snapshot.phases.length > MAX_PHASE_LOG) {
    snapshot.phases.shift();
  }
  console.warn(`[Startup] startup_error ${message}`);
}

export function logStartup(phase: StartupPhase, detail?: string) {
  touch();
  snapshot.lastPhase = phase;
  snapshot.lastDetail = detail ?? null;
  snapshot.phases.push({ phase, detail, at: new Date().toISOString() });
  if (snapshot.phases.length > MAX_PHASE_LOG) {
    snapshot.phases.shift();
  }
  // Successful lifecycle events are informational — not warnings.
  if (__DEV__) {
    console.log(`[Startup] ${phase}${detail ? ` — ${detail}` : ""}`);
  }
}

export function patchStartupSnapshot(
  patch: Partial<
    Pick<
      StartupSnapshot,
      | "fontsLoaded"
      | "authLoading"
      | "isReady"
      | "isAuthenticated"
      | "bootstrapIssue"
      | "introDone"
      | "splashExpired"
    >
  >
) {
  Object.assign(snapshot, patch);
  touch();
}

export function getStartupSnapshot(): Readonly<StartupSnapshot> {
  touch();
  return { ...snapshot, phases: [...snapshot.phases] };
}

/** Release-safe API constants — hostname only, never tokens. */
export function logReleaseStartupConstants() {
  const diag = getApiBuildDiagnostics();
  console.log(`[API Config] environment=${diag.buildEnv}`);
  console.log(`[API Config] base=${API_BASE_URL || "(missing)"}`);
  console.warn("[Startup] release mode:", !__DEV__);
  console.warn("[Startup] API hostname:", diag.apiHostname);
  console.warn("[Startup] app version:", diag.appVersion);
  console.warn("[Startup] build commit:", diag.gitCommit);
  if (__DEV__) {
    console.log("[Startup] Login URL:", getProductionApiEndpoints().login);
    console.log("[Startup] Config source:", diag.configSource);
  }
}
