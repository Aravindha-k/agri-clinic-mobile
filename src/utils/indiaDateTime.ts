/**
 * Canonical operational timezone for Kavya Agri Clinic mobile display.
 * Reuses BUSINESS_TIME_ZONE — do not hardcode +05:30 offsets.
 */
import { BUSINESS_TIME_ZONE } from "./workdayCalendar";

export { BUSINESS_TIME_ZONE as INDIA_TIME_ZONE };

const OFFSET_AWARE =
  /(?:Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE_DATE_TIME =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type ParseServerInstantOptions = {
  /**
   * When the value has no offset/Z, treat the clock as UTC (legacy visit_date+visit_time).
   * Default false — do not assume every naive string is UTC.
   */
  assumeUtcIfNaive?: boolean;
};

/** Parse a server/storage timestamp into a Date instant, or null if invalid. */
export function parseServerInstant(
  value?: string | number | Date | null,
  options?: ParseServerInstantOptions
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (DATE_ONLY.test(raw)) {
    // Date-only calendar fields are business dates in Asia/Kolkata, not UTC midnight display.
    // Represent as noon IST so the calendar day is stable under formatting.
    const ms = Date.parse(`${raw}T06:30:00.000Z`); // 12:00 IST
    if (!Number.isFinite(ms)) return null;
    return new Date(ms);
  }

  if (OFFSET_AWARE.test(raw)) {
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms);
  }

  const naive = raw.match(NAIVE_DATE_TIME);
  if (naive) {
    const normalized = `${naive[1]}T${naive[2]}`;
    const ms = options?.assumeUtcIfNaive
      ? Date.parse(`${normalized}Z`)
      : Date.parse(normalized);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms);
  }

  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

function formatParts(
  instant: Date,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    ...options
  }).format(instant);
}

export function formatIndiaDate(value?: string | number | Date | null): string {
  const d = parseServerInstant(value);
  if (!d) return "—";
  return formatParts(d, { day: "numeric", month: "short", year: "numeric" });
}

export function formatIndiaTime(value?: string | number | Date | null): string {
  const d = parseServerInstant(value);
  if (!d) return "—";
  return formatParts(d, { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Primary UI datetime: "26 Aug 2026 · 10:59 pm"
 * (en-IN may lowercase am/pm — normalize to upper for acceptance consistency)
 */
export function formatIndiaDateTime(value?: string | number | Date | null): string {
  const d = parseServerInstant(value);
  if (!d) return "Not recorded";
  const date = formatParts(d, { day: "numeric", month: "short", year: "numeric" });
  const time = formatParts(d, { hour: "numeric", minute: "2-digit", hour12: true }).replace(
    /\b(am|pm)\b/gi,
    (m) => m.toUpperCase()
  );
  return `${date} · ${time}`;
}

export function formatIndiaShortDateTime(value?: string | number | Date | null): string {
  const d = parseServerInstant(value);
  if (!d) return "—";
  return formatParts(d, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

export function formatIndiaDateLong(value?: string | number | Date | null): string {
  const d = parseServerInstant(value);
  if (!d) return "—";
  return formatParts(d, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function formatIndiaDateMedium(value?: string | number | Date | null): string {
  const d = parseServerInstant(value);
  if (!d) return "—";
  return formatParts(d, { day: "numeric", month: "short", year: "numeric" });
}

export function formatIndiaWeekdayDate(value?: string | number | Date | null): string {
  const d = parseServerInstant(value);
  if (!d) return "—";
  return formatParts(d, { weekday: "long", day: "numeric", month: "short" });
}

export function formatIndiaWeekdayDateShort(value?: string | number | Date | null): string {
  const d = parseServerInstant(value);
  if (!d) return "—";
  return formatParts(d, { weekday: "short", day: "numeric", month: "short" });
}

/** Asia/Kolkata calendar YYYY-MM-DD for an instant. */
export function indiaCalendarDate(value?: string | number | Date | null): string | null {
  const d = parseServerInstant(value);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

/**
 * Legacy visit_date + visit_time were filled from toISOString() slices (UTC components).
 * Return an offset-aware ISO so callers never parse them as device-local.
 */
export function legacyVisitDateTimeToIso(
  visitDate?: string | null,
  visitTime?: string | null
): string | null {
  if (!visitDate) return null;
  const datePart = String(visitDate).trim();
  const dateOnly = datePart.includes("T") ? datePart.split("T")[0] : datePart.slice(0, 10);
  if (!DATE_ONLY.test(dateOnly)) return null;

  if (!visitTime) {
    // Date-only: noon IST stable calendar day (not claiming a UTC clock).
    return `${dateOnly}T06:30:00.000Z`;
  }

  const timeRaw = String(visitTime).trim();
  if (OFFSET_AWARE.test(timeRaw) || timeRaw.includes("T")) {
    const d = parseServerInstant(timeRaw.includes("T") ? timeRaw : `${dateOnly}T${timeRaw}`);
    return d ? d.toISOString() : null;
  }

  let timePart = timeRaw.length <= 5 ? `${timeRaw}:00` : timeRaw;
  if (/^\d{2}:\d{2}:\d{2}$/.test(timePart)) {
    timePart = `${timePart}.000`;
  }
  const iso = `${dateOnly}T${timePart}Z`;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function formatIndiaRelativeTime(iso?: string | null, nowMs = Date.now()): string {
  const then = parseServerInstant(iso);
  if (!then) return "Never";
  const diffMs = nowMs - then.getTime();
  if (diffMs < 0) return "Just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return formatParts(then, { month: "short", day: "numeric" });
}
