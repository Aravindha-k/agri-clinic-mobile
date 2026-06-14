import type { WorkdayStatus } from "../api/tracking";
import { WORKDAY_EXPIRED_ALERT_MESSAGE } from "../constants/workdayMessages";

export type WorkdayFetchResult =
  | { kind: "active"; workday: WorkdayStatus }
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
    /no active workday|not active|already ended|workday not started/i.test(message)
  );
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

  const startedAt =
    typeof row.started_at === "string"
      ? row.started_at
      : typeof row.start_time === "string"
        ? row.start_time
        : undefined;

  return {
    id: typeof row.id === "number" ? row.id : workdayId,
    workday_id: workdayId,
    date: typeof row.date === "string" ? row.date : undefined,
    start_time: typeof row.start_time === "string" ? row.start_time : startedAt,
    started_at: startedAt,
    end_time: (row.end_time as string | null | undefined) ?? null,
    is_active: row.is_active !== false,
    auto_ended: Boolean(row.auto_ended),
    last_heartbeat: typeof row.last_heartbeat === "string" ? row.last_heartbeat : null,
    last_location: (row.last_location as WorkdayStatus["last_location"]) ?? null
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
  return /already.*(active|started)|workday.*(active|started)|duplicate.*workday/i.test(message);
}

export function workdayFetchFromError(error: unknown): WorkdayFetchResult | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (isWorkdayExpiredMessage(message)) {
    return { kind: "expired", message: WORKDAY_EXPIRED_ALERT_MESSAGE };
  }
  if (isWorkdayInactiveMessage(message)) {
    return { kind: "none" };
  }
  return null;
}
