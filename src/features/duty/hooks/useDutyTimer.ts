import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { FIELD_MAX_WORKDAY_MS } from "../../../constants/fieldTracking";
import { useDuty } from "../store/DutyContext";

function parseMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function formatHms(ms: number) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function dutyNumber(duty: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = duty[key];
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Workday elapsed time is wall-clock based (now - started_at).
 * JS intervals freeze while minimized/locked, but elapsed stays correct and
 * snaps forward immediately when the app becomes active again.
 */
export function useDutyTimer() {
  const { currentDuty, serverTimeOffsetMs } = useDuty();
  const [now, setNow] = useState(() => Date.now());

  const active = currentDuty?.is_active !== false && Boolean(currentDuty?.started_at || currentDuty?.start_time);
  const status = String((currentDuty as Record<string, unknown> | null)?.status ?? "").toLowerCase();
  const completed = !active || status === "completed" || status === "auto_completed";

  useEffect(() => {
    setNow(Date.now());
    if (completed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        setNow(Date.now());
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [completed, currentDuty?.started_at, currentDuty?.start_time]);

  return useMemo(() => {
    const row = (currentDuty ?? {}) as Record<string, unknown>;
    const startMs = parseMs(currentDuty?.started_at ?? currentDuty?.start_time);
    const endedMs = parseMs(row.ended_at ?? row.end_time);
    const limitMs = (dutyNumber(row, ["duration_limit_seconds", "limit_seconds"]) ?? FIELD_MAX_WORKDAY_MS / 1000) * 1000;
    const authoritativeNow = completed && endedMs != null ? endedMs : now + serverTimeOffsetMs;
    const elapsedMs = startMs == null ? 0 : Math.min(limitMs, Math.max(0, authoritativeNow - startMs));
    const remainingMs = Math.max(0, limitMs - elapsedMs);
    const expectedEndAt = startMs == null ? null : new Date(startMs + limitMs).toISOString();

    return {
      elapsedMs,
      remainingMs,
      elapsedDisplay: formatHms(elapsedMs),
      remainingDisplay: formatHms(remainingMs),
      expectedEndAt,
      completed,
      active: !completed && startMs != null
    };
  }, [completed, currentDuty, now, serverTimeOffsetMs]);
}
