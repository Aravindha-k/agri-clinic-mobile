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

/** Only treat as active when server row has id and is_active is not explicitly false. */
export function normalizeActiveWorkday(raw: WorkdayStatus | null | undefined): WorkdayStatus | null {
  if (!raw?.workday_id) {
    return null;
  }
  if (raw.is_active === false) {
    return null;
  }
  return raw;
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
