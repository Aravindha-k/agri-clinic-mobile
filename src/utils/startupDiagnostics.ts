import {
  API_BASE_URL,
  buildApiUrl,
  PRODUCTION_API_ENDPOINTS,
  PRODUCTION_API_ORIGIN
} from "../api/config";

export type StartupPhase =
  | "first_render"
  | "native_splash_hold"
  | "native_splash_hide_attempt"
  | "native_splash_hidden"
  | "cinematic_component_rendered"
  | "cinematic_mounted"
  | "cinematic_first_layout"
  | "cinematic_animation_started"
  | "cinematic_ready"
  | "cinematic_exit_start"
  | "cinematic_exit_started"
  | "cinematic_finished"
  | "providers_module_ready"
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
  | "splash_replay"
  | "splash_start"
  | "splash_end"
  | "splash_timeout";

export type StartupSnapshot = {
  releaseMode: boolean;
  apiBaseUrl: string;
  loginUrl: string;
  buildEnvOrigin: string;
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

const snapshot: StartupSnapshot = {
  releaseMode: typeof __DEV__ !== "undefined" ? !__DEV__ : true,
  apiBaseUrl: API_BASE_URL,
  loginUrl: buildApiUrl("mobile/auth/login/", API_BASE_URL),
  buildEnvOrigin: PRODUCTION_API_ORIGIN,
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
  snapshot.updatedAt = new Date().toISOString();
  snapshot.releaseMode = !__DEV__;
  snapshot.apiBaseUrl = API_BASE_URL;
  snapshot.loginUrl = buildApiUrl("mobile/auth/login/", API_BASE_URL);
}

export function logStartupError(message: string) {
  touch();
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

/** Release-safe API constants — URLs only in development logs. */
export function logReleaseStartupConstants() {
  console.log("[Startup] release mode:", !__DEV__);
  if (__DEV__) {
    console.log("[Startup] API base URL:", API_BASE_URL);
    console.log("[Startup] Login URL:", PRODUCTION_API_ENDPOINTS.login);
    console.log(
      "[Startup] Build env EXPO_PUBLIC_API_BASE_URL:",
      process.env.EXPO_PUBLIC_API_BASE_URL ?? "(unset)"
    );
    console.log("[Startup] Build env EXPO_PUBLIC_API_URL:", process.env.EXPO_PUBLIC_API_URL ?? "(unset)");
  }
}
