import { apiClient } from "./client";

/** Canonical duty tracking routes under /api/v1/. */
export const DUTY_TRACKING_ROUTES = {
  start: "tracking/duty/start/",
  end: "tracking/duty/end/",
  current: "tracking/duty/current/",
  locationUpdate: "tracking/location/update/",
  locationBulk: "tracking/location/bulk/"
} as const;

type DutyRequestInit = RequestInit & { source?: string };

export async function dutyTrackingPost<T = unknown>(
  dutyPath: string,
  init: DutyRequestInit
): Promise<T> {
  return await apiClient<T>(dutyPath, { ...init, dedupe: false });
}

export async function dutyTrackingGet<T = unknown>(
  dutyPath: string,
  init: DutyRequestInit = {}
): Promise<T> {
  return await apiClient<T>(dutyPath, { ...init, method: "GET", dedupe: false });
}
