import { API_BASE_URL } from "./config";
import { apiClient } from "./client";
import { ApiRequestError } from "../utils/apiError";

/** Duty tracking routes (relative to API base, e.g. …/api/ or …/api/v1/). */
export const DUTY_TRACKING_ROUTES = {
  start: "tracking/duty/start/",
  end: "tracking/duty/end/",
  current: "tracking/duty/current/",
  locationUpdate: "tracking/location/update/",
  locationBulk: "tracking/location/bulk/"
} as const;

/** Legacy v1 workday routes — last-resort fallback only. */
export const LEGACY_TRACKING_ROUTES = {
  start: "tracking/workday/start/",
  end: "tracking/workday/end/",
  current: "tracking/workday/current/",
  locationPush: "tracking/location/push/"
} as const;

/** `/api/` base without the `v1` segment (e.g. https://host/api/). */
export function resolveNonV1ApiBase(): string | null {
  const match = API_BASE_URL.match(/^(.*\/api)\/v1\/?$/i);
  return match ? `${match[1]}/` : null;
}

function shouldTryNextBase(error: unknown) {
  return error instanceof ApiRequestError && (error.status === 404 || error.status === 405);
}

type DutyRequestInit = RequestInit & { source?: string };

/**
 * POST duty tracking endpoints:
 * 1. /api/tracking/… (non-v1)
 * 2. /api/v1/tracking/… (app default base)
 * 3. legacy workday/location push path on v1 base
 */
export async function dutyTrackingPost<T = unknown>(
  dutyPath: string,
  init: DutyRequestInit,
  legacyPath?: string
): Promise<T> {
  const nonV1Base = resolveNonV1ApiBase();
  if (nonV1Base) {
    try {
      return await apiClient<T>(dutyPath, { ...init, baseUrl: nonV1Base, dedupe: false });
    } catch (error) {
      if (!shouldTryNextBase(error)) {
        throw error;
      }
    }
  }

  try {
    return await apiClient<T>(dutyPath, { ...init, dedupe: false });
  } catch (error) {
    if (legacyPath && shouldTryNextBase(error)) {
      return await apiClient<T>(legacyPath, { ...init, dedupe: false });
    }
    throw error;
  }
}

/** GET with the same /api → /api/v1 fallback chain. */
export async function dutyTrackingGet<T = unknown>(
  dutyPath: string,
  init: DutyRequestInit = {},
  legacyPath?: string
): Promise<T> {
  const nonV1Base = resolveNonV1ApiBase();
  if (nonV1Base) {
    try {
      return await apiClient<T>(dutyPath, { ...init, method: "GET", baseUrl: nonV1Base, dedupe: false });
    } catch (error) {
      if (!shouldTryNextBase(error)) {
        throw error;
      }
    }
  }

  try {
    return await apiClient<T>(dutyPath, { ...init, method: "GET", dedupe: false });
  } catch (error) {
    if (legacyPath && shouldTryNextBase(error)) {
      return await apiClient<T>(legacyPath, { ...init, method: "GET", dedupe: false });
    }
    throw error;
  }
}
