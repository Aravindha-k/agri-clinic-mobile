import {
  API_BASE_URL,
  buildApiUrl,
  PRODUCTION_API_ENDPOINTS,
  PRODUCTION_API_ORIGIN
} from "../api/config";

export type StartupPhase =
  | "first_render"
  | "native_splash_hide_attempt"
  | "app_ready"
  | "startup_error"
  | "app_mount"
  | "fonts_loading"
  | "fonts_ready"
  | "fonts_timeout"
  | "tracking_task_deferred"
  | "auth_bootstrap_start"
  | "auth_bootstrap_end"
  | "auth_bootstrap_timeout"
  | "splash_start"
  | "splash_end"
  | "splash_timeout"
  | "nav_login"
  | "nav_home"
  | "nav_error"
  | "nav_stuck_fallback";

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
  console.warn(
    `[Startup] ${phase}${detail ? ` — ${detail}` : ""} | release=${!__DEV__} api=${API_BASE_URL}`
  );
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

/** Release-safe API constants — visible in logcat on APK cold start. */
export function logReleaseStartupConstants() {
  console.warn("[Startup] release mode:", !__DEV__);
  console.warn("[Startup] API base URL:", API_BASE_URL);
  console.warn("[Startup] Login URL:", PRODUCTION_API_ENDPOINTS.login);
  console.warn("[Startup] Build env EXPO_PUBLIC_API_URL:", process.env.EXPO_PUBLIC_API_URL ?? "(unset)");
}
