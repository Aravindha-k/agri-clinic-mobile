/**
 * Canonical business calendar for Kavya field work.
 *
 * Source of truth: Asia/Kolkata date derived from server_now (or skew-adjusted now).
 * Device local date is NOT authoritative for workday rollover.
 */

export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

/** Asia/Kolkata calendar date as YYYY-MM-DD. */
export function getCanonicalWorkDate(reference: Date | number = new Date()): string {
  const date = typeof reference === "number" ? new Date(reference) : reference;
  if (Number.isNaN(date.getTime())) {
    return getCanonicalWorkDate(new Date());
  }
  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/**
 * Derive today's business date from bootstrap server_now.
 * Falls back to skew-adjusted device clock when server_now is missing.
 */
export function getCanonicalWorkDateFromServerNow(
  serverNow: string | null | undefined,
  serverTimeOffsetMs = 0
): string {
  if (serverNow?.trim()) {
    const ms = Date.parse(serverNow);
    if (Number.isFinite(ms)) {
      return getCanonicalWorkDate(ms);
    }
  }
  return getCanonicalWorkDate(Date.now() + serverTimeOffsetMs);
}

/** @deprecated Prefer getCanonicalWorkDate — kept for SecureStore session helpers. */
export function getLocalWorkDate(date = new Date()): string {
  return getCanonicalWorkDate(date);
}

export function workDateFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
    return iso.trim();
  }
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return getCanonicalWorkDate(ms);
}

export function isSameLocalWorkDate(
  isoOrDate: string | null | undefined,
  reference: Date | number | string = new Date()
): boolean {
  const workDate =
    typeof isoOrDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)
      ? isoOrDate
      : workDateFromIso(isoOrDate);
  if (!workDate) return false;
  const refDate =
    typeof reference === "string"
      ? getCanonicalWorkDateFromServerNow(reference)
      : getCanonicalWorkDate(reference);
  return workDate === refDate;
}

export function isWorkDateToday(
  workDate: string | null | undefined,
  reference: Date | number | string = new Date()
): boolean {
  if (!workDate?.trim()) return false;
  const refDate =
    typeof reference === "string"
      ? getCanonicalWorkDateFromServerNow(reference)
      : getCanonicalWorkDate(reference);
  return workDate.trim() === refDate;
}

export function formatWorkDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export type DutyDateFields = {
  is_active?: boolean;
  work_date?: string | null;
  date?: string | null;
  started_at?: string | null;
  start_time?: string | null;
  ended_at?: string | null;
  end_time?: string | null;
};

/**
 * Resolve a duty/workday's business date from payload fields.
 */
export function resolveDutyWorkDate(duty: DutyDateFields | null | undefined): string | null {
  if (!duty) return null;
  if (typeof duty.work_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(duty.work_date.trim())) {
    return duty.work_date.trim();
  }
  if (typeof duty.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(duty.date.trim())) {
    return duty.date.trim();
  }
  return (
    workDateFromIso(duty.ended_at) ??
    workDateFromIso(duty.end_time) ??
    workDateFromIso(duty.started_at) ??
    workDateFromIso(duty.start_time)
  );
}

/**
 * Keep active duties (midnight-crossing). Drop completed duties from earlier days.
 */
export function reconcileDutyForCanonicalDay<T extends DutyDateFields>(
  duty: T | null,
  canonicalDate: string
): T | null {
  if (!duty) return null;
  if (duty.is_active) return duty;
  const dutyDate = resolveDutyWorkDate(duty);
  if (!dutyDate) return null;
  if (dutyDate !== canonicalDate) return null;
  return duty;
}
