import { apiClient } from "../../../api/client";
import type { Employee } from "../../../api/employees";
import type { WorkdayStatus } from "../../../api/tracking";
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

function normalizeBootstrapDuty(raw: unknown): WorkdayStatus | null {
  const row = asRecord(raw);
  if (!row) return null;
  const status = String(row.status ?? row.state ?? "").toLowerCase();
  if (status === "not_started" || status === "none") return null;
  const workday = normalizeWorkdayRow(row);
  if (!workday) return null;
  if (status === "completed" || status === "auto_completed" || workday.is_active === false) {
    return { ...workday, is_active: false, auto_ended: status === "auto_completed" || workday.auto_ended };
  }
  return normalizeActiveWorkday(workday) ?? workday;
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
  const mapRaw = row.current_map ?? row.currentMap ?? row.map_summary ?? row.duty_map ?? row.dutyMap;

  return {
    user,
    deviceSession: row.device_session ?? row.deviceSession ?? row.active_device_session ?? null,
    currentDuty: normalizeBootstrapDuty(currentDutyRaw),
    dutyMap: mapRaw ? normalizeDutyMapPayload(mapRaw) : null,
    serverNow,
    serverTimeOffsetMs: Number.isFinite(serverMs) ? serverMs - Date.now() : 0,
    featureFlags: (pickRecord(row, ["feature_flags", "featureFlags"]) as Record<string, unknown> | null) ?? {},
    raw
  };
}

export async function fetchMobileBootstrap(): Promise<MobileBootstrap> {
  const raw = await apiClient<unknown>("mobile/bootstrap/", {
    method: "GET",
    source: "MobileBootstrap",
    dedupe: false
  });
  return normalizeMobileBootstrap(raw);
}
