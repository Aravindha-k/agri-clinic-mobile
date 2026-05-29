/** Parse latitude/longitude from API strings, numbers, or comma-separated pairs. */
export function parseMapCoord(value?: string | number | null): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  const first = raw.split(/[,;\s]+/)[0];
  const p = Number(first);
  return Number.isFinite(p) ? p : null;
}

export function hasValidMapCoords(lat?: string | number | null, lng?: string | number | null): boolean {
  const la = parseMapCoord(lat);
  const lo = parseMapCoord(lng);
  if (la == null || lo == null) return false;
  return la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}

export function toMapCoordinate(
  lat?: string | number | null,
  lng?: string | number | null
): { latitude: number; longitude: number } | null {
  const latitude = parseMapCoord(lat);
  const longitude = parseMapCoord(lng);
  if (latitude == null || longitude == null) return null;
  if (!hasValidMapCoords(latitude, longitude)) return null;
  return { latitude, longitude };
}
