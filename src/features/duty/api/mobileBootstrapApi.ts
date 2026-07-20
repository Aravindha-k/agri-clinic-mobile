import { apiClient } from "../../../api/client";
import type { Employee } from "../../../api/employees";
import type { WorkdayStatus } from "../../../api/tracking";
import {
  getCanonicalWorkDateFromServerNow,
  reconcileDutyForCanonicalDay
} from "../../../utils/workdayCalendar";
import { normalizeActiveWorkday, normalizeWorkdayRow } from "../../../utils/workdayStatus";
import { normalizeDutyMapPayload } from "./dutyMapApi";
import type { MobileBootstrap } from "../types/duty";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickRecord(row: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = asRecord(row[key]);
    if (value) return value;
  }
  return null;
}

function pickString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeBootstrapDuty(raw: unknown, canonicalDate: string): WorkdayStatus | null {
  const row = asRecord(raw);
  if (!row) return null;
  const status = String(row.status ?? row.state ?? "").toLowerCase();
  if (status === "not_started" || status === "none") return null;
  const workday = normalizeWorkdayRow(row);
  if (!workday) return null;
  let duty: WorkdayStatus;
  if (status === "completed" || status === "auto_completed" || workday.is_active === false) {
    duty = { ...workday, is_active: false, auto_ended: status === "auto_completed" || workday.auto_ended };
  } else {
    duty = normalizeActiveWorkday(workday) ?? workday;
  }
  return reconcileDutyForCanonicalDay(duty, canonicalDate);
}

export function normalizeMobileBootstrap(raw: unknown): MobileBootstrap {
  const row = asRecord(raw) ?? {};
  const user = (pickRecord(row, ["user", "employee", "profile"]) as Employee | null) ?? null;
  const currentDutyRaw =
    row.current_duty ??
    row.currentDuty ??
    row.duty_session ??
    row.dutySession ??
    row.workday ??
    row.current_workday;
  const serverNow =
    pickString(row, ["server_now", "serverNow", "server_time", "serverTime", "now"]) ??
    pickString(asRecord(currentDutyRaw) ?? {}, ["server_now", "server_time"]);
  const serverMs = serverNow ? Date.parse(serverNow) : NaN;
  const serverTimeOffsetMs = Number.isFinite(serverMs) ? serverMs - Date.now() : 0;
  const canonicalDate = getCanonicalWorkDateFromServerNow(serverNow, serverTimeOffsetMs);
  const mapRaw =
    row.current_map ??
    row.currentMap ??
    row.day_map ??
    row.dayMap ??
    row.map_summary ??
    row.duty_map ??
    row.dutyMap;
  const currentDuty = normalizeBootstrapDuty(currentDutyRaw, canonicalDate);
  // Compact bootstrap day_map has flags only — keep full map null until map endpoint.
  const mapRecord = asRecord(mapRaw);
  const isCompactSummary =
    mapRecord != null &&
    mapRecord.start_marker == null &&
    mapRecord.visit_markers == null &&
    (mapRecord.has_start_marker != null || mapRecord.full_map_path != null);
  const dutyMap =
    currentDuty && mapRaw && !isCompactSummary ? normalizeDutyMapPayload(mapRaw) : null;

  return {
    user,
    deviceSession: row.device_session ?? row.deviceSession ?? row.active_device_session ?? null,
    currentDuty,
    dutyMap,
    serverNow,
    serverTimeOffsetMs,
    featureFlags: (pickRecord(row, ["feature_flags", "featureFlags"]) as Record<string, unknown> | null) ?? {},
    raw
  };
}

/** Freshness window for non-forced bootstrap (AppState / tab focus). */
export const MOBILE_BOOTSTRAP_FRESH_MS = 45_000;

let bootstrapFlight: Promise<MobileBootstrap> | null = null;
let lastBootstrapAt = 0;
let lastBootstrap: MobileBootstrap | null = null;

export function invalidateMobileBootstrapCache(): void {
  lastBootstrap = null;
  lastBootstrapAt = 0;
}

/**
 * Canonical mobile bootstrap — single-flight + optional freshness reuse.
 * Force on login, pull-to-refresh, and post-online recovery.
 */
export async function fetchMobileBootstrap(options?: { force?: boolean }): Promise<MobileBootstrap> {
  if (!options?.force && lastBootstrap && Date.now() - lastBootstrapAt < MOBILE_BOOTSTRAP_FRESH_MS) {
    return lastBootstrap;
  }
  if (bootstrapFlight) {
    return bootstrapFlight;
  }

  bootstrapFlight = (async () => {
    try {
      const raw = await apiClient<unknown>("mobile/bootstrap/", {
        method: "GET",
        source: "MobileBootstrap"
        // GET dedupe enabled (default)
      });
      const next = normalizeMobileBootstrap(raw);
      lastBootstrap = next;
      lastBootstrapAt = Date.now();
      return next;
    } finally {
      bootstrapFlight = null;
    }
  })();

  return bootstrapFlight;
}
