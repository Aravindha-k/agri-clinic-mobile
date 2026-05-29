import { useEffect, useMemo, useState } from "react";

export function useLiveClock(tickMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return useMemo(() => {
    const time = now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    const date = now.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "short"
    });
    const dateShort = now.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
    return { now, time, date, dateShort };
  }, [now]);
}

/** Live HH:MM:SS elapsed since workday start. */
export function useWorkdayTimer(startedAt: string | null, active: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  return useMemo(() => {
    if (!active || !startedAt) {
      return { elapsedMs: 0, h: 0, m: 0, s: 0, display: "00:00:00", compact: "0h 0m" };
    }
    const start = new Date(startedAt).getTime();
    if (Number.isNaN(start)) {
      return { elapsedMs: 0, h: 0, m: 0, s: 0, display: "00:00:00", compact: "0h 0m" };
    }
    const elapsedMs = Math.max(0, now - start);
    const totalSec = Math.floor(elapsedMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      elapsedMs,
      h,
      m,
      s,
      display: `${pad(h)}:${pad(m)}:${pad(s)}`,
      compact: `${h}h ${m}m`
    };
  }, [active, now, startedAt]);
}
