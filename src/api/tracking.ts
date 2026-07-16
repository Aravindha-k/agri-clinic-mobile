import { apiClient } from "./client";
import {
  DUTY_TRACKING_ROUTES,
  dutyTrackingGet,
  dutyTrackingPost
} from "./dutyTrackingApi";
import { getDeviceInfo } from "../utils/deviceInfo";
import { ApiRequestError } from "../utils/apiError";
import {
  isWorkdayAlreadyActiveMessage,
  isWorkdayInactiveMessage,
  normalizeActiveWorkday,
  normalizeWorkdayRow,
  workdayFetchFromError,
  type WorkdayFetchResult
} from "../utils/workdayStatus";

export type TrackingLocation = {
  latitude: string | number;
  longitude: string | number;
  accuracy?: number | null;
  recorded_at?: string;
};

/** POST tracking/location/update/ — employee inferred from auth token only. */
export type LocationPushPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  battery_level?: number | null;
  captured_at: string;
  /** Alias for captured_at — some backends expect `timestamp`. */
  timestamp?: string;
  /** Legacy field accepted by some backends alongside captured_at. */
  recorded_at?: string;
  /** Duty session from POST tracking/duty/start/ */
  duty_session_id?: number;
  workday_id?: number;
  /** Device GPS on and foreground permission granted. */
  gps_enabled?: boolean;
  /** granted | foreground_only | denied | undetermined | services_disabled */
  location_permission_status?: string;
  /** Background permission granted and native route task running. */
  background_tracking_enabled?: boolean;
  /** Stable client id for offline GPS dedup and partial batch ack. */
  client_point_id?: string;
};

export type GpsBulkFailedItem = {
  index?: number;
  local_point_id?: string;
  client_point_id?: string;
  code: string;
  message: string;
  retryable?: boolean;
};

export type GpsBulkSyncResult = {
  success_count: number;
  failed_count: number;
  accepted_ids?: string[];
  failed_items?: GpsBulkFailedItem[];
  route_points_saved?: number;
  duty_session_id?: number;
  workday_id?: number;
};

export type LocationLogPoint = TrackingLocation & {
  id?: number;
};

export type WorkdayStatus = {
  id?: number;
  workday_id: number;
  /** Session id returned by duty/start — sent with location updates. */
  duty_session_id?: number;
  latitude?: string | number | null;
  longitude?: string | number | null;
  date?: string;
  start_time?: string;
  started_at?: string;
  end_time?: string | null;
  ended_at?: string | null;
  is_active?: boolean;
  auto_ended?: boolean;
  last_heartbeat?: string | null;
  last_location?: TrackingLocation | null;
  server_time?: string;
  total_work_duration_ms?: number;
  duration_limit_seconds?: number;
};

export function isWorkdayActive(status: WorkdayStatus | null | undefined) {
  return normalizeActiveWorkday(status) !== null;
}

/** Fetch active canonical duty session. */
export async function fetchCurrentDuty(): Promise<WorkdayFetchResult> {
  try {
    const data = await dutyTrackingGet<unknown>(
      DUTY_TRACKING_ROUTES.current,
      { source: "Tracking" }
    );
    const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    const statusRaw = typeof row?.status === "string" ? String(row.status).toLowerCase() : "";

    if (statusRaw === "not_started" || (row && row.is_active === false && !row.workday_id && !row.duty_session_id)) {
      return { kind: "none" };
    }

    const workday = normalizeWorkdayRow(data);
    if (!workday) {
      if (statusRaw === "completed") {
        return { kind: "none" };
      }
      return { kind: "none" };
    }

    if (statusRaw === "completed" || workday.is_active === false) {
      return { kind: "completed", workday: { ...workday, is_active: false } };
    }

    const active = normalizeActiveWorkday(workday);
    if (!active) {
      const expired = workdayFetchFromError(new Error("auto-ended after 9 hours"));
      if (workday.auto_ended) {
        return expired ?? { kind: "none" };
      }
      return { kind: "none" };
    }
    return { kind: "active", workday: active };
  } catch (error) {
    const mapped = workdayFetchFromError(error);
    if (mapped) {
      return mapped;
    }
    throw error;
  }
}

/** @deprecated Prefer fetchCurrentDuty */
export async function fetchCurrentWorkday(): Promise<WorkdayFetchResult> {
  return fetchCurrentDuty();
}

/** @deprecated Prefer fetchCurrentWorkday for expiry-aware handling. */
export async function getCurrentWorkday() {
  const result = await fetchCurrentWorkday();
  if (result.kind === "active") {
    return result.workday;
  }
  return null;
}

export async function getTodayWorkday(): Promise<WorkdayStatus | null> {
  const result = await fetchCurrentWorkday();
  if (result.kind === "active") {
    return result.workday;
  }
  return null;
}

export type WorkdayStartCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startDutySession(coords: WorkdayStartCoords): Promise<WorkdayStatus | null> {
  const data = await dutyTrackingPost<unknown>(
    DUTY_TRACKING_ROUTES.start,
    {
      method: "POST",
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? undefined
      }),
      source: "Tracking"
    }
  );
  return normalizeActiveWorkday(normalizeWorkdayRow(data));
}

/** @deprecated Use startDutySession */
export async function startWorkday(coords?: WorkdayStartCoords): Promise<WorkdayStatus | null> {
  if (!coords) {
    return null;
  }
  return startDutySession(coords);
}

/** Start duty or resume existing session — never creates duplicate duty sessions. */
export async function ensureActiveWorkday(coords: WorkdayStartCoords): Promise<WorkdayStatus> {
  const existing = await fetchCurrentDuty();
  if (existing.kind === "active") {
    return existing.workday;
  }

  let lastError: unknown = null;

  try {
    const started = await startDutySession(coords);
    if (started) {
      return started;
    }
  } catch (error) {
    lastError = error;
    const message = error instanceof Error ? error.message : "";
    if (error instanceof ApiRequestError && error.status === 409) {
      const current = await fetchCurrentDuty();
      if (current.kind === "active") {
        return current.workday;
      }
    }
    if (!isWorkdayAlreadyActiveMessage(message) && !isWorkdayInactiveMessage(message)) {
      throw error;
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      await sleep(400 * attempt);
    }
    const current = await fetchCurrentDuty();
    if (current.kind === "active") {
      return current.workday;
    }
  }

  if (lastError instanceof ApiRequestError) {
    throw lastError;
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new ApiRequestError("Could not confirm your workday. Please try again.");
}

export function endDutySession(dutySessionId?: number | null) {
  const body =
    dutySessionId != null && Number.isFinite(dutySessionId) && dutySessionId > 0
      ? { duty_session_id: dutySessionId }
      : {};
  return dutyTrackingPost(
    DUTY_TRACKING_ROUTES.end,
    {
      method: "POST",
      body: JSON.stringify(body),
      source: "Tracking"
    }
  );
}

/** @deprecated Use endDutySession */
export function endWorkday() {
  return endDutySession();
}

export async function sendTrackingHeartbeat(options?: { gpsEnabledHint?: boolean }) {
  const { getGpsStateReport } = await import("../utils/gpsStateReport");
  const report = await getGpsStateReport(options);
  return apiClient("tracking/heartbeat/", {
    method: "POST",
    body: JSON.stringify(report)
  });
}

/** @deprecated Prefer sendTrackingHeartbeat — still accepts boolean hint for callers. */
export function sendHeartbeat(gpsEnabled: boolean) {
  return sendTrackingHeartbeat({ gpsEnabledHint: gpsEnabled });
}

export async function pushLocation(
  location: LocationPushPayload,
  options?: { gpsEnabledHint?: boolean }
) {
  const { enrichLocationPushPayload } = await import("../utils/gpsStateReport");
  const body = await enrichLocationPushPayload(location, options);
  return dutyTrackingPost(
    DUTY_TRACKING_ROUTES.locationUpdate,
    {
      method: "POST",
      body: JSON.stringify(body),
      source: "Tracking"
    }
  );
}

function toBulkPoint(location: LocationPushPayload) {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy ?? undefined,
    speed: location.speed ?? undefined,
    heading: location.heading ?? undefined,
    battery_level: location.battery_level ?? undefined,
    duty_session_id: location.duty_session_id,
    captured_at: location.captured_at,
    recorded_at: location.recorded_at ?? location.captured_at,
    timestamp: location.timestamp ?? location.captured_at,
    workday_id: location.workday_id,
    client_point_id: location.client_point_id,
    gps_enabled: location.gps_enabled,
    location_permission_status: location.location_permission_status,
    background_tracking_enabled: location.background_tracking_enabled
  };
}

/** Flush offline route points via bulk endpoint (falls back to per-point location/update). */
export async function pushLocationsBulk(locations: LocationPushPayload[]): Promise<GpsBulkSyncResult> {
  const { enrichLocationPushPayload } = await import("../utils/gpsStateReport");
  const device = getDeviceInfo();
  const enriched = await Promise.all(locations.map((point) => enrichLocationPushPayload(point)));
  const raw = await dutyTrackingPost<Record<string, unknown>>(
    DUTY_TRACKING_ROUTES.locationBulk,
    {
      method: "POST",
      body: JSON.stringify({
        locations: enriched.map(toBulkPoint),
        device_model: device.device_model,
        app_version: device.app_version
      }),
      source: "Tracking"
    }
  );
  return normalizeGpsBulkSyncResult(raw);
}

function normalizeGpsBulkSyncResult(raw: Record<string, unknown>): GpsBulkSyncResult {
  const data =
    raw && typeof raw === "object" && "success_count" in raw
      ? raw
      : (raw?.data as Record<string, unknown> | undefined) ?? raw;
  const acceptedRaw = data?.accepted_ids;
  const failedRaw = data?.failed_items;
  return {
    success_count: Number(data?.success_count ?? 0),
    failed_count: Number(data?.failed_count ?? 0),
    accepted_ids: Array.isArray(acceptedRaw)
      ? acceptedRaw.map((id) => String(id)).filter(Boolean)
      : undefined,
    failed_items: Array.isArray(failedRaw)
      ? (failedRaw as GpsBulkFailedItem[])
      : undefined,
    route_points_saved:
      data?.route_points_saved != null ? Number(data.route_points_saved) : undefined,
    duty_session_id:
      data?.duty_session_id != null ? Number(data.duty_session_id) : undefined,
    workday_id: data?.workday_id != null ? Number(data.workday_id) : undefined
  };
}

export async function syncLocationQueue(queue: LocationPushPayload[]) {
  if (!queue.length) return;
  if (queue.length === 1) {
    await pushLocation(queue[0]);
    return;
  }
  await pushLocationsBulk(queue);
}
