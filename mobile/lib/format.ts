import {
  formatIndiaTime,
  formatIndiaWeekdayDate,
  parseServerInstant
} from "../../src/utils/indiaDateTime";
import { BUSINESS_TIME_ZONE } from "../../src/utils/workdayCalendar";

export function formatHeaderDate(date = new Date()): string {
  return formatIndiaWeekdayDate(date);
}

function indiaHour(date = new Date()): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: BUSINESS_TIME_ZONE,
      hour: "numeric",
      hour12: false
    }).format(date)
  );
  return Number.isFinite(hour) ? hour % 24 : date.getHours();
}

export function greetingForHour(hour = indiaHour()): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatElapsedHms(startedAt: string | null | undefined, nowMs: number): string {
  if (!startedAt) return "00:00:00";
  const start = parseServerInstant(startedAt)?.getTime();
  if (start == null) return "00:00:00";
  const sec = Math.max(0, Math.floor((nowMs - start) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatShortTime(iso?: string | null): string {
  return formatIndiaTime(iso);
}

export function formatDistanceKm(km?: number | null): string {
  if (km == null || Number.isNaN(km)) return "0.0";
  return km < 10 ? km.toFixed(1) : Math.round(km).toString();
}
