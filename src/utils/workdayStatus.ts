import type { WorkdayStatus } from "../api/tracking";
import { WORKDAY_EXPIRED_ALERT_MESSAGE } from "../constants/workdayMessages";
import { ApiRequestError } from "./apiError";

export type WorkdayFetchResult =
  | { kind: "active"; workday: WorkdayStatus }
  | { kind: "completed"; workday: WorkdayStatus }
  | { kind: "none" }
  | { kind: "expired"; message: string };

/** True when API/body indicates the 9-hour workday window ended. */
export function isWorkdayExpiredMessage(message: string): boolean {
  return /auto-ended|workday_expired|auto ended after 9|ended after 9 hours|9 hours.*start/i.test(
    message
  );
}

export function isWorkdayInactiveMessage(message: string): boolean {
  return (
    isWorkdayExpiredMessage(message) ||
    isDutySessionMismatchMessage(message) ||
    /no active workday|not active|already ended|workday not started/i.test(message)
  );
}

/** Server rejected location because cached duty_session_id is stale or wrong. */
export function isDutySessionMismatchMessage(message: string): boolean {
  return /duty_session_id.*does not match|active duty session/i.test(message);
}

export function isWorkdayExpiredPayload(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }
  const row = data as Record<string, unknown>;
  if (row.code === "workday_expired") {
    return true;
  }
  const detail = typeof row.detail === "string" ? row.detail : "";
  return isWorkdayExpiredMessage(detail);
}

/** Map API workday payloads (`id` or `workday_id`) into a consistent shape. */
export function normalizeWorkdayRow(raw: unknown): WorkdayStatus | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const workdayId = Number(row.workday_id ?? row.id);
  if (!Number.isFinite(workdayId) || workdayId <= 0) {
    return null;
  }

  const dutySessionRaw = row.duty_session_id ?? row.session_id ?? row.duty_id;
  let dutySessionId = dutySessionRaw != null ? Number(dutySessionRaw) : undefined;
  const rowId = typeof row.id === "number" ? row.id : undefined;
  if (
    (dutySessionId == null || !Number.isFinite(dutySessionId) || dutySessionId <= 0) &&
    rowId != null &&
    rowId > 0 &&
    rowId !== workdayId
  ) {
    dutySessionId = rowId;
  }

  const startedAt =
    typeof row.started_at === "string"
      ? row.started_at
      : typeof row.start_time === "string"
        ? row.start_time
        : undefined;

  const statusRaw = typeof row.status === "string" ? row.status.toLowerCase() : "";
  const isActive =
    row.is_active === true ||
    (row.is_active !== false && statusRaw !== "completed" && statusRaw !== "not_started");

  return {
    id: typeof row.id === "number" ? row.id : workdayId,
    workday_id: workdayId,
    duty_session_id:
      dutySessionId != null && Number.isFinite(dutySessionId) && dutySessionId > 0
        ? dutySessionId
        : undefined,
    latitude:
      typeof row.latitude === "string" || typeof row.latitude === "number"
        ? row.latitude
        : null,
    longitude:
      typeof row.longitude === "string" || typeof row.longitude === "number"
        ? row.longitude
        : null,
    date:
      typeof row.work_date === "string"
        ? row.work_date
        : typeof row.date === "string"
          ? row.date
          : undefined,
    start_time: typeof row.start_time === "string" ? row.start_time : startedAt,
    started_at: startedAt,
    end_time: (row.end_time as string | null | undefined) ?? (row.end_work_time as string | null | undefined) ?? null,
    ended_at: (row.ended_at as string | null | undefined) ?? (row.end_time as string | null | undefined) ?? null,
    is_active: isActive,
    auto_ended: Boolean(row.auto_ended),
    last_heartbeat: typeof row.last_heartbeat === "string" ? row.last_heartbeat : null,
    last_location: (row.last_location as WorkdayStatus["last_location"]) ?? null,
    server_time: typeof row.server_time === "string" ? row.server_time : undefined,
    total_work_duration_ms:
      typeof row.total_work_duration_ms === "number" ? row.total_work_duration_ms : undefined,
    duration_limit_seconds:
      typeof row.duration_limit_seconds === "number" ? row.duration_limit_seconds : undefined
  };
}

/** Only treat as active when server row has id and is_active is not explicitly false. */
export function normalizeActiveWorkday(raw: WorkdayStatus | null | undefined): WorkdayStatus | null {
  const normalized = normalizeWorkdayRow(raw);
  if (!normalized || normalized.is_active === false) {
    return null;
  }
  return normalized;
}

export function isWorkdayAlreadyActiveMessage(message: string): boolean {
  return /already.*(active|started)|workday.*(active|started)|duty.*(active|started)|duplicate.*(workday|duty)/i.test(
    message
  );
}

export function isDutyCurrentNotFoundError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 404;
}

export function workdayFetchFromError(error: unknown): WorkdayFetchResult | null {
  if (isDutyCurrentNotFoundError(error)) {
    return { kind: "none" };
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (isWorkdayExpiredMessage(message)) {
    return { kind: "expired", message: WORKDAY_EXPIRED_ALERT_MESSAGE };
  }
  if (isWorkdayInactiveMessage(message)) {
    return { kind: "none" };
  }
  return null;
}
