import Constants from "expo-constants";

/** AWS production host (no scheme/path) — prefer a real domain once TLS is ready. */
export const PRODUCTION_API_HOST = "13.207.17.117";

/**
 * HTTPS origin for documentation and media URLs when TLS is available.
 * Runtime login uses EXPO_PUBLIC_API_BASE_URL / expo.extra.apiBaseUrl (HTTP QA today).
 */
export const PRODUCTION_API_ORIGIN = `https://${PRODUCTION_API_HOST}`;

/** Media/static files live on the server root — not under /api/v1/. */
export const PRODUCTION_MEDIA_ORIGIN = PRODUCTION_API_ORIGIN;

/**
 * Documented HTTPS REST base — not used as a silent release fallback when env is missing.
 */
export const PRODUCTION_API_BASE_URL = `${PRODUCTION_API_ORIGIN}/api/v1/`;

/** Local backend for `npx expo start` only (__DEV__). */
const LOCAL_DEV_API_BASE_URL = "http://10.0.2.2:8000/api/v1/";

const BLOCKED_RELEASE_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

type AppExtra = {
  apiBaseUrl?: string;
  apiUrl?: string;
  buildEnv?: string;
  gitCommit?: string;
  appVersion?: string;
};

function readExpoExtra(): AppExtra {
  return (Constants.expoConfig?.extra ?? {}) as AppExtra;
}

/** Prebuild embeds extra.apiBaseUrl from app.config.js — reliable when Metro env inlining is absent. */
function readExpoExtraApiBase(): string | undefined {
  const extra = readExpoExtra();
  const raw = extra.apiBaseUrl?.trim() || extra.apiUrl?.trim();
  return raw || undefined;
}

/** Client QA APK uses HTTP to the AWS host — Android cleartext is configured in release manifest. */
function isAllowedInsecureProductionUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.hostname === PRODUCTION_API_HOST) {
      return true;
    }
  } catch {
    return false;
  }
  return process.env.EXPO_PUBLIC_ALLOW_INSECURE_HTTP === "1";
}

function assertSecureProductionUrl(url: string): void {
  if (__DEV__) return;

  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error(
      "Production APK missing API base URL. Set EXPO_PUBLIC_API_BASE_URL before building the release bundle."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Production APK has an invalid API base URL: ${trimmed}`);
  }

  if (BLOCKED_RELEASE_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Production APK cannot use ${parsed.hostname}. Configure the deployed backend hostname via EXPO_PUBLIC_API_BASE_URL.`
    );
  }

  if (parsed.protocol === "http:" && !isAllowedInsecureProductionUrl(trimmed)) {
    throw new Error(
      "Production API base URL must use HTTPS. Set EXPO_PUBLIC_API_BASE_URL to an https:// endpoint. " +
        "For temporary QA HTTP on the AWS host, set EXPO_PUBLIC_ALLOW_INSECURE_HTTP=1 at build time."
    );
  }
}

/** Normalize build env input — accepts host origin or full /api/v1/ base; never duplicates. */
export function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (!__DEV__) {
      throw new Error("API base URL cannot be empty in production builds.");
    }
    return PRODUCTION_API_BASE_URL;
  }

  let url = trimmed.replace(/\/+$/, "");

  // Collapse accidental duplicate /api/v1 suffixes.
  url = url.replace(/(\/api\/v1)+$/i, "/api/v1");

  if (!/\/api\/v1$/i.test(url)) {
    if (/\/api$/i.test(url)) {
      url = `${url}/v1`;
    } else {
      url = `${url}/api/v1`;
    }
  }

  return `${url}/`;
}

/** Build absolute API URL from a relative path segment. */
export function buildApiUrl(path: string, baseUrl: string = API_BASE_URL): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\/+/, "")}`;
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

/**
 * Canonical build-time sources (in order):
 * 1. EXPO_PUBLIC_API_BASE_URL (Metro-inlined in release bundle)
 * 2. EXPO_PUBLIC_API_URL
 * 3. expo.extra.apiBaseUrl (embedded at prebuild)
 */
function readBuildApiEnv(): string | undefined {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (base) return base;
  const origin = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (origin) return origin;
  return readExpoExtraApiBase();
}

function resolveApiBaseUrl(): string {
  const fromEnv = readBuildApiEnv();

  if (!__DEV__) {
    if (!fromEnv) {
      throw new Error(
        "Production APK missing API configuration. Set EXPO_PUBLIC_API_BASE_URL (or EXPO_PUBLIC_API_URL) " +
          "before npm install, expo prebuild, and Gradle assembleRelease. The value is also written to expo.extra.apiBaseUrl at prebuild."
      );
    }
    const resolved = normalizeApiBaseUrl(fromEnv);
    assertSecureProductionUrl(resolved);
    return resolved;
  }

  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  const useCloud =
    process.env.EXPO_PUBLIC_USE_PRODUCTION_API === "1" ||
    process.env.EXPO_PUBLIC_USE_PRODUCTION_API === "true";
  if (useCloud) {
    return normalizeApiBaseUrl(readExpoExtraApiBase() || PRODUCTION_API_ORIGIN);
  }
  const devOverride = process.env.EXPO_PUBLIC_DEV_API_URL?.trim();
  return normalizeApiBaseUrl(devOverride || LOCAL_DEV_API_BASE_URL);
}

export const API_BASE_URL = resolveApiBaseUrl();

/** True when app talks to AWS production (APK / release builds). */
export const IS_PRODUCTION_API = isProductionApiUrl(API_BASE_URL);

export function getApiHostname(): string {
  try {
    return new URL(API_BASE_URL).hostname;
  } catch {
    return "unknown";
  }
}

export function getApiOrigin(): string {
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
  return {
    releaseMode: !__DEV__,
    buildEnv: extra.buildEnv ?? process.env.EXPO_PUBLIC_ENV ?? (__DEV__ ? "development" : "unknown"),
    apiHostname: getApiHostname(),
    apiOrigin: getApiOrigin(),
    apiBasePath: (() => {
      try {
        return new URL(API_BASE_URL).pathname;
      } catch {
        return "/api/v1/";
      }
    })(),
    appVersion: extra.appVersion ?? Constants.expoConfig?.version ?? "unknown",
    gitCommit: extra.gitCommit?.slice(0, 12) || "unknown",
    configSource: process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
      ? "EXPO_PUBLIC_API_BASE_URL"
      : process.env.EXPO_PUBLIC_API_URL?.trim()
        ? "EXPO_PUBLIC_API_URL"
        : readExpoExtraApiBase()
          ? "expo.extra.apiBaseUrl"
          : "unset"
  };
}
