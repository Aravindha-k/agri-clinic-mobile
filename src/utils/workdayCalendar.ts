/** Local calendar date as YYYY-MM-DD (device timezone). */
export function getLocalWorkDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function workDateFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return getLocalWorkDate(new Date(ms));
}

export function isSameLocalWorkDate(
  isoOrDate: string | null | undefined,
  reference = new Date()
): boolean {
  const workDate = typeof isoOrDate === "string" && isoOrDate.length === 10
    ? isoOrDate
    : workDateFromIso(isoOrDate);
  if (!workDate) return false;
  return workDate === getLocalWorkDate(reference);
}

export function isWorkDateToday(workDate: string | null | undefined, reference = new Date()): boolean {
  if (!workDate?.trim()) return false;
  return workDate.trim() === getLocalWorkDate(reference);
}

export function formatWorkDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
