import { apiClient } from "./client";
import { getDeviceInfo } from "../utils/deviceInfo";
import { asArray } from "../utils/format";
import { resolveList } from "../utils/apiUnwrap";
import {
  normalizeActiveWorkday,
  workdayFetchFromError,
  type WorkdayFetchResult
} from "../utils/workdayStatus";

export type TrackingLocation = {
  latitude: string | number;
  longitude: string | number;
  accuracy?: number | null;
  recorded_at?: string;
};

/** POST tracking/location/push/ — employee inferred from auth token only. */
export type LocationPushPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  captured_at: string;
  /** Legacy field accepted by some backends alongside captured_at. */
  recorded_at?: string;
  workday_id?: number;
};

export type LocationLogPoint = TrackingLocation & {
  id?: number;
};

export type WorkdayStatus = {
  id?: number;
  workday_id: number;
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

/** Fetch current workday; never throws on expired/missing — returns a discriminated result. */
export async function fetchCurrentWorkday(): Promise<WorkdayFetchResult> {
  try {
    const data = await apiClient<WorkdayStatus>("tracking/workday/current/");
    const workday = normalizeActiveWorkday(data);
    if (!workday) {
      if (data?.auto_ended || data?.is_active === false) {
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

export function startWorkday() {
  return apiClient("tracking/workday/start/", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function endWorkday() {
  return apiClient("tracking/workday/end/", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function sendHeartbeat(gpsEnabled: boolean) {
  return apiClient("tracking/heartbeat/", {
    method: "POST",
    body: JSON.stringify({ gps_enabled: gpsEnabled })
  });
}

export function pushLocation(location: LocationPushPayload) {
  return apiClient("tracking/location/push/", {
    method: "POST",
    body: JSON.stringify(location)
  });
}

function toBulkPoint(location: LocationPushPayload) {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy ?? undefined,
    speed: location.speed ?? undefined,
    heading: location.heading ?? undefined,
    captured_at: location.captured_at,
    recorded_at: location.recorded_at ?? location.captured_at
  };
}

/** Flush offline route points (up to 500 per request). */
export function pushLocationsBulk(locations: LocationPushPayload[]) {
  const device = getDeviceInfo();
  return apiClient("tracking/location/bulk/", {
    method: "POST",
    body: JSON.stringify({
      locations: locations.map(toBulkPoint),
      device_model: device.device_model,
      app_version: device.app_version
    })
  });
}

export async function syncLocationQueue(queue: LocationPushPayload[]) {
  if (!queue.length) return;
  if (queue.length === 1) {
    await pushLocation(queue[0]);
    return;
  }
  await pushLocationsBulk(queue);
}
