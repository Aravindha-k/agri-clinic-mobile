import Constants from "expo-constants";
import {
  BLOCKED_RELEASE_HOSTS,
  LOCAL_DEV_API_BASE_URL,
  PRODUCTION_API_BASE_URL,
  PRODUCTION_API_HOST,
  normalizeApiBaseUrl,
  readExplicitApiEnv
} from "./apiBaseUrl.js";

export {
  LOCAL_DEV_API_BASE_URL,
  PRODUCTION_API_BASE_URL,
  PRODUCTION_API_HOST,
  normalizeApiBaseUrl
};

/** HTTPS origin for documentation and media URLs when TLS is available. */
export const PRODUCTION_API_ORIGIN = `https://${PRODUCTION_API_HOST}`;

/** Media/static files live on the server root — not under /api/v1/. */
export const PRODUCTION_MEDIA_ORIGIN = PRODUCTION_API_ORIGIN;

export type ApiConfigErrorCode =
  | "MISSING_URL"
  | "INVALID_URL"
  | "BLOCKED_HOST"
  | "INSECURE_HTTP"
  | "EMPTY_URL";

export type ApiConfigError = {
  code: ApiConfigErrorCode;
  message: string;
  category: "configuration";
};

type AppExtra = {
  apiBaseUrl?: string;
  apiUrl?: string;
  buildEnv?: string;
  gitCommit?: string;
  appVersion?: string;
};

type ApiConfigResolution =
  | { ok: true; baseUrl: string; source: string; environment: string }
  | { ok: false; error: ApiConfigError; environment: string };

function configError(code: ApiConfigErrorCode, message: string): ApiConfigError {
  return { code, message, category: "configuration" };
}

function readExpoExtra(): AppExtra {
  return (Constants.expoConfig?.extra ?? {}) as AppExtra;
}

function readExpoExtraApiBase(): string | undefined {
  const extra = readExpoExtra();
  const raw = extra.apiBaseUrl?.trim() || extra.apiUrl?.trim();
  return raw || undefined;
}

function resolveEnvironmentLabel(): string {
  const extra = readExpoExtra();
  const fromExtra = extra.buildEnv?.trim();
  if (fromExtra) return fromExtra;
  const fromEnv = process.env.EXPO_PUBLIC_ENV?.trim();
  if (fromEnv) return fromEnv;
  return __DEV__ ? "development" : "production";
}

/** Client QA may allow HTTP to the AWS IP when explicitly opted in at build time. */
function isAllowedInsecureProductionUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.hostname === PRODUCTION_API_HOST) {
      return process.env.EXPO_PUBLIC_ALLOW_INSECURE_HTTP === "1";
    }
  } catch {
    return false;
  }
  return process.env.EXPO_PUBLIC_ALLOW_INSECURE_HTTP === "1";
}

function validateProductionUrl(url: string): ApiConfigError | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return configError(
      "MISSING_URL",
      "Production APK missing API base URL. Set EXPO_PUBLIC_API_URL before building the release bundle."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return configError("INVALID_URL", "Production APK has an invalid API base URL.");
  }

  if (BLOCKED_RELEASE_HOSTS.has(parsed.hostname)) {
    return configError(
      "BLOCKED_HOST",
      `Production APK cannot use ${parsed.hostname}. Configure the deployed backend via EXPO_PUBLIC_API_URL.`
    );
  }

  if (parsed.protocol === "http:" && !isAllowedInsecureProductionUrl(trimmed)) {
    return configError(
      "INSECURE_HTTP",
      "Production API base URL must use HTTPS, or set EXPO_PUBLIC_ALLOW_INSECURE_HTTP=1 for the QA HTTP host at build time."
    );
  }

  return null;
}

/** Build absolute API URL from a relative path segment. */
export function buildApiUrl(path: string, baseUrl: string = API_BASE_URL): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\/+/, "")}`;
}

/**
 * Canonical runtime resolver.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL / EXPO_PUBLIC_API_URL (active .env or EAS profile)
 * 2. expo.extra.apiBaseUrl (embedded at prebuild from the same env — release/preview)
 * 3. Development Metro only: LOCAL_DEV_API_BASE_URL
 *
 * Never uses __DEV__ alone to pick AWS vs LAN for preview APKs (__DEV__ is false there).
 * Never silently replaces an explicit env URL.
 */
function resolveApiConfig(): ApiConfigResolution {
  const environment = resolveEnvironmentLabel();
  const explicit = readExplicitApiEnv(process.env);
  const fromExtra = readExpoExtraApiBase();

  if (explicit) {
    const normalized = normalizeApiBaseUrl(explicit);
    if (!normalized) {
      return {
        ok: false,
        environment,
        error: configError("EMPTY_URL", "API base URL cannot be empty.")
      };
    }
    if (!__DEV__) {
      const validationError = validateProductionUrl(normalized);
      if (validationError) {
        return { ok: false, environment, error: validationError };
      }
    }
    return {
      ok: true,
      baseUrl: normalized,
      source: process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
        ? "EXPO_PUBLIC_API_BASE_URL"
        : "EXPO_PUBLIC_API_URL",
      environment
    };
  }

  if (!__DEV__) {
    if (!fromExtra) {
      return {
        ok: false,
        environment,
        error: configError(
          "MISSING_URL",
          "Production APK missing API configuration. Set EXPO_PUBLIC_API_URL in the EAS profile " +
            "before npm install, expo prebuild, and Gradle assembleRelease."
        )
      };
    }
    const normalized = normalizeApiBaseUrl(fromExtra);
    if (!normalized) {
      return {
        ok: false,
        environment,
        error: configError("EMPTY_URL", "API base URL cannot be empty in production builds.")
      };
    }
    const validationError = validateProductionUrl(normalized);
    if (validationError) {
      return { ok: false, environment, error: validationError };
    }
    return { ok: true, baseUrl: normalized, source: "expo.extra.apiBaseUrl", environment };
  }

  // Local Expo / Metro: never inherit a stale AWS URL from expo.extra when env is unset.
  return {
    ok: true,
    baseUrl: LOCAL_DEV_API_BASE_URL,
    source: "LOCAL_DEV_API_BASE_URL",
    environment
  };
}

const _resolvedConfig = resolveApiConfig();

/** Never throws at import — empty string when misconfigured. */
export const API_BASE_URL = _resolvedConfig.ok ? _resolvedConfig.baseUrl : "";

export const API_CONFIG_ERROR: ApiConfigError | null = _resolvedConfig.ok ? null : _resolvedConfig.error;

export const API_CONFIG_SOURCE = _resolvedConfig.ok ? _resolvedConfig.source : "error";

export const API_CONFIG_ENVIRONMENT = _resolvedConfig.environment;

export function getApiConfigError(): ApiConfigError | null {
  return API_CONFIG_ERROR;
}

export function hasValidApiConfig(): boolean {
  return API_CONFIG_ERROR === null && API_BASE_URL.length > 0;
}

/** Canonical production endpoints — derived from the resolved runtime API base. */
export function getProductionApiEndpoints(baseUrl: string = API_BASE_URL) {
  return {
    login: buildApiUrl("mobile/auth/login/", baseUrl),
    refresh: buildApiUrl("mobile/auth/refresh/", baseUrl),
    me: buildApiUrl("mobile/auth/me/", baseUrl),
    farmers: buildApiUrl("farmers/", baseUrl),
    crops: buildApiUrl("masters/crops/", baseUrl),
    problemCategories: buildApiUrl("masters/problem-categories/dropdown/", baseUrl),
    visits: buildApiUrl("mobile/visits/", baseUrl),
    dutyStart: buildApiUrl("tracking/duty/start/", baseUrl),
    dutyCurrent: buildApiUrl("tracking/duty/current/", baseUrl),
    locationUpdate: buildApiUrl("tracking/location/update/", baseUrl),
    locationBulk: buildApiUrl("tracking/location/bulk/", baseUrl),
    heartbeat: buildApiUrl("tracking/heartbeat/", baseUrl)
  } as const;
}

export const PRODUCTION_API_ENDPOINTS = getProductionApiEndpoints();

function isProductionApiUrl(url: string): boolean {
  return url.includes(PRODUCTION_API_HOST) || (!__DEV__ && url.startsWith("https://"));
}

/** True when app talks to AWS production (APK / release builds). */
export const IS_PRODUCTION_API = isProductionApiUrl(API_BASE_URL);

export function getApiHostname(): string {
  if (!API_BASE_URL) return "unknown";
  try {
    return new URL(API_BASE_URL).hostname;
  } catch {
    return "unknown";
  }
}

export function getApiOrigin(): string {
  if (!API_BASE_URL) return "unknown";
  try {
    const parsed = new URL(API_BASE_URL);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "unknown";
  }
}

/** Safe diagnostics for About / startup — hostname only, no tokens. */
export function getApiBuildDiagnostics() {
  const extra = readExpoExtra();
  const configError = getApiConfigError();
  return {
    releaseMode: !__DEV__,
    buildEnv: API_CONFIG_ENVIRONMENT,
    apiHostname: getApiHostname(),
    apiOrigin: getApiOrigin(),
    apiBasePath: (() => {
      if (!API_BASE_URL) return "/api/v1/";
      try {
        return new URL(API_BASE_URL).pathname;
      } catch {
        return "/api/v1/";
      }
    })(),
    appVersion: extra.appVersion ?? Constants.expoConfig?.version ?? "unknown",
    gitCommit: extra.gitCommit?.slice(0, 12) || "unknown",
    configSource: API_CONFIG_SOURCE,
    configErrorCode: configError?.code ?? null
  };
}

/** Safe one-line startup log — never tokens or request bodies. */
export function logApiConfigStartup(): void {
  console.log(`[API Config] environment=${API_CONFIG_ENVIRONMENT}`);
  console.log(`[API Config] base=${API_BASE_URL || "(missing)"}`);
  console.log(`[API Config] source=${API_CONFIG_SOURCE}`);
}

logApiConfigStartup();
