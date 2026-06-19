/** AWS production host (no scheme/path). */
export const PRODUCTION_API_HOST = "13.207.17.117";

/**
 * Production server origin — set EXPO_PUBLIC_API_URL to this in builds.
 * Example: http://13.207.17.117
 */
export const PRODUCTION_API_ORIGIN = `http://${PRODUCTION_API_HOST}`;

/** Media/static files live on the server root — not under /api/v1/. */
export const PRODUCTION_MEDIA_ORIGIN = PRODUCTION_API_ORIGIN;

/**
 * Runtime REST base used by apiClient/fetch/axios.
 * The client does NOT append /api/v1 automatically — paths are like `mobile/auth/login/`.
 */
export const PRODUCTION_API_BASE_URL = `${PRODUCTION_API_ORIGIN}/api/v1/`;

/** Local backend for `npx expo start` only (__DEV__). */
const LOCAL_DEV_API_BASE_URL = "http://10.0.2.2:8000/api/v1/";

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
  return url.includes(PRODUCTION_API_HOST);
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  if (__DEV__) {
    const useCloud =
      process.env.EXPO_PUBLIC_USE_PRODUCTION_API === "1" ||
      process.env.EXPO_PUBLIC_USE_PRODUCTION_API === "true";
    if (useCloud) {
      return PRODUCTION_API_BASE_URL;
    }
    const devOverride = process.env.EXPO_PUBLIC_DEV_API_URL?.trim();
    return normalizeApiBaseUrl(devOverride || LOCAL_DEV_API_BASE_URL);
  }

  return PRODUCTION_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** True when app talks to AWS production (APK / release builds). */
export const IS_PRODUCTION_API = isProductionApiUrl(API_BASE_URL);
