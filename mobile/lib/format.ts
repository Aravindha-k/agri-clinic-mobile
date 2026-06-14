export function formatHeaderDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short"
  });
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatElapsedHms(startedAt: string | null | undefined, nowMs: number): string {
  if (!startedAt) return "00:00:00";
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return "00:00:00";
  const sec = Math.max(0, Math.floor((nowMs - start) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatShortTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatDistanceKm(km?: number | null): string {
  if (km == null || Number.isNaN(km)) return "0.0";
  return km < 10 ? km.toFixed(1) : Math.round(km).toString();
}
