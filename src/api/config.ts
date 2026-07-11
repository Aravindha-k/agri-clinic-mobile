/** AWS production host (no scheme/path) — prefer a real domain once TLS is ready. */
export const PRODUCTION_API_HOST = "13.207.17.117";

/**
 * Production API must be configured via EXPO_PUBLIC_API_BASE_URL / EXPO_PUBLIC_API_URL
 * using HTTPS. Cleartext HTTP is blocked in release builds unless explicitly allowed
 * for emergency diagnostics (EXPO_PUBLIC_ALLOW_INSECURE_HTTP=1).
 */
export const PRODUCTION_API_ORIGIN = `https://${PRODUCTION_API_HOST}`;

/** Media/static files live on the server root — not under /api/v1/. */
export const PRODUCTION_MEDIA_ORIGIN = PRODUCTION_API_ORIGIN;

/**
 * Runtime REST base used by apiClient/fetch/axios.
 * The client does NOT append /api/v1 automatically — paths are like `mobile/auth/login/`.
 */
export const PRODUCTION_API_BASE_URL = `${PRODUCTION_API_ORIGIN}/api/v1/`;

/** Local backend for `npx expo start` only (__DEV__). */
const LOCAL_DEV_API_BASE_URL = "http://10.0.2.2:8000/api/v1/";

/** Client QA APK uses HTTP to the AWS host — Android cleartext is configured in release manifest. */
function isAllowedInsecureProductionUrl(url: string): boolean {
  if (process.env.EXPO_PUBLIC_ALLOW_INSECURE_HTTP === "1") {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" && parsed.hostname === PRODUCTION_API_HOST;
  } catch {
    return false;
  }
}

function assertSecureProductionUrl(url: string): void {
  if (__DEV__) return;
  if (url.startsWith("http://") && !isAllowedInsecureProductionUrl(url)) {
    throw new Error(
      "Production API base URL must use HTTPS. Set EXPO_PUBLIC_API_BASE_URL to an https:// endpoint. " +
        "See HTTPS_DEPLOYMENT_REQUIREMENTS.md. To override temporarily, set EXPO_PUBLIC_ALLOW_INSECURE_HTTP=1."
    );
  }
  if (!process.env.EXPO_PUBLIC_API_BASE_URL?.trim() && !process.env.EXPO_PUBLIC_API_URL?.trim()) {
    throw new Error(
      "Production builds require EXPO_PUBLIC_API_BASE_URL (or EXPO_PUBLIC_API_URL) with an https:// API. " +
        "Hardcoded cleartext fallbacks are disabled."
    );
  }
}

/** Normalize build env input — accepts host origin or full /api/v1/ base; never duplicates. */
export function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
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
export function buildApiUrl(path: string, baseUrl: string = PRODUCTION_API_BASE_URL): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\/+/, "")}`;
}

/** Canonical production endpoints — used for diagnostics and audits. */
export const PRODUCTION_API_ENDPOINTS = {
  login: buildApiUrl("mobile/auth/login/"),
  refresh: buildApiUrl("mobile/auth/refresh/"),
  me: buildApiUrl("mobile/auth/me/"),
  farmers: buildApiUrl("farmers/"),
  crops: buildApiUrl("masters/crops/"),
  problemCategories: buildApiUrl("masters/problem-categories/dropdown/"),
  visits: buildApiUrl("mobile/visits/"),
  dutyStart: buildApiUrl("tracking/duty/start/"),
  dutyCurrent: buildApiUrl("tracking/duty/current/"),
  locationUpdate: buildApiUrl("tracking/location/update/"),
  locationBulk: buildApiUrl("tracking/location/bulk/"),
  heartbeat: buildApiUrl("tracking/heartbeat/")
} as const;

function isProductionApiUrl(url: string): boolean {
  return url.includes(PRODUCTION_API_HOST) || (!__DEV__ && url.startsWith("https://"));
}

/** Read API URL from EAS / .env.production — full /api/v1/ base or host origin. */
function readBuildApiEnv(): string | undefined {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (base) return base;
  const origin = process.env.EXPO_PUBLIC_API_URL?.trim();
  return origin || undefined;
}

function resolveApiBaseUrl(): string {
  const fromEnv = readBuildApiEnv();

  // Release/APK: env required + HTTPS enforced — never silent LAN/HTTP fallback.
  if (!__DEV__) {
    if (!fromEnv) {
      assertSecureProductionUrl("");
    }
    const resolved = normalizeApiBaseUrl(fromEnv as string);
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
    const cloud = fromEnv ? normalizeApiBaseUrl(fromEnv) : PRODUCTION_API_BASE_URL;
    return cloud;
  }
  const devOverride = process.env.EXPO_PUBLIC_DEV_API_URL?.trim();
  return normalizeApiBaseUrl(devOverride || LOCAL_DEV_API_BASE_URL);
}

export const API_BASE_URL = resolveApiBaseUrl();

/** True when app talks to AWS production (APK / release builds). */
export const IS_PRODUCTION_API = isProductionApiUrl(API_BASE_URL);
