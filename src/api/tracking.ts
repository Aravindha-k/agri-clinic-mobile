import { apiClient } from "./client";
import {
  DUTY_TRACKING_ROUTES,
  dutyTrackingGet,
  dutyTrackingPost,
  LEGACY_TRACKING_ROUTES
} from "./dutyTrackingApi";
import { getDeviceInfo } from "../utils/deviceInfo";
import { asArray } from "../utils/format";
import { resolveList } from "../utils/apiUnwrap";
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
};

export type LocationLogPoint = TrackingLocation & {
  id?: number;
};

export type WorkdayStatus = {
  id?: number;
  workday_id: number;
  /** Session id returned by duty/start — sent with location updates. */
  duty_session_id?: number;
  date?: string;
  start_time?: string;
  started_at?: string;
  end_time?: string | null;
  is_active?: boolean;
  auto_ended?: boolean;
  last_heartbeat?: string | null;
  last_location?: TrackingLocation | null;
};

type PaginatedLocations = {
  results?: LocationLogPoint[];
  next?: string | null;
  count?: number;
};

export function isWorkdayActive(status: WorkdayStatus | null | undefined) {
  return normalizeActiveWorkday(status) !== null;
}

/** Fetch active duty session; falls back to legacy workday/current. */
export async function fetchCurrentDuty(): Promise<WorkdayFetchResult> {
  try {
    const data = await dutyTrackingGet<unknown>(
      DUTY_TRACKING_ROUTES.current,
      { source: "Tracking" },
      LEGACY_TRACKING_ROUTES.current
    );
    const workday = normalizeActiveWorkday(normalizeWorkdayRow(data));
    if (!workday) {
      const row = normalizeWorkdayRow(data);
      if (row?.auto_ended || row?.is_active === false) {
        return workdayFetchFromError(new Error("auto-ended after 9 hours")) ?? { kind: "none" };
      }
      return { kind: "none" };
    }
    return { kind: "active", workday };
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

export async function getWorkdayHistory() {
  const data = await apiClient<WorkdayStatus[] | PaginatedLocations>("tracking/workdays/history/");
  return asArray<WorkdayStatus>(data).length ? asArray<WorkdayStatus>(data) : resolveList<WorkdayStatus>(data);
}

export async function getTodayWorkday(): Promise<WorkdayStatus | null> {
  const result = await fetchCurrentWorkday();
  if (result.kind === "active") {
    return result.workday;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const history = await getWorkdayHistory();
  return (
    history.find((w) => {
      const d = w.date ? String(w.date).slice(0, 10) : "";
      return d === todayKey && w.is_active !== false;
    }) ?? null
  );
}

export async function getWorkdayLocationsPage(workdayId: number, page = 1, pageSize = 200) {
  return apiClient<PaginatedLocations>(
    `tracking/workday/${workdayId}/locations/?page=${page}&page_size=${pageSize}`
  );
}

/** All GPS points for a workday (paginated fetch). */
export async function getAllWorkdayLocations(workdayId: number): Promise<LocationLogPoint[]> {
  const all: LocationLogPoint[] = [];
  for (let page = 1; page <= 25; page += 1) {
    const data = await getWorkdayLocationsPage(workdayId, page);
    const batch = Array.isArray(data?.results) ? data.results : resolveList<LocationLogPoint>(data);
    all.push(...batch);
    if (!data?.next || batch.length === 0) break;
  }
  return all;
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
    },
    LEGACY_TRACKING_ROUTES.start
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
    if (!isWorkdayAlreadyActiveMessage(message) && !isWorkdayInactiveMessage(message)) {
      await startMobileWorkSession(coords);
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

/** Best-effort mobile dashboard work session — must not block tracking workday start. */
export async function startMobileWorkSession(coords: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}) {
  try {
    await apiClient("mobile/work/start/", {
      method: "POST",
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? undefined
      }),
      source: "Tracking"
    });
  } catch {
    // tracking/workday/start/ remains source of truth
  }
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
    },
    LEGACY_TRACKING_ROUTES.end
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
    },
    LEGACY_TRACKING_ROUTES.locationPush
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
    duty_session_id: location.duty_session_id ?? location.workday_id ?? undefined,
    captured_at: location.captured_at,
    recorded_at: location.recorded_at ?? location.captured_at,
    timestamp: location.timestamp ?? location.captured_at,
    workday_id: location.workday_id ?? location.duty_session_id ?? undefined,
    gps_enabled: location.gps_enabled,
    location_permission_status: location.location_permission_status,
    background_tracking_enabled: location.background_tracking_enabled
  };
}

/** Flush offline route points via bulk endpoint (falls back to per-point location/update). */
export async function pushLocationsBulk(locations: LocationPushPayload[]) {
  const { enrichLocationPushPayload } = await import("../utils/gpsStateReport");
  const device = getDeviceInfo();
  const enriched = await Promise.all(locations.map((point) => enrichLocationPushPayload(point)));
  return dutyTrackingPost(
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
}

export async function syncLocationQueue(queue: LocationPushPayload[]) {
  if (!queue.length) return;
  if (queue.length === 1) {
    await pushLocation(queue[0]);
    return;
  }
  await pushLocationsBulk(queue);
}
