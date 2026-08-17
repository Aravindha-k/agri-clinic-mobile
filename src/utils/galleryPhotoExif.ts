export type GalleryExifLocation = {
  latitude: number;
  longitude: number;
  timestamp?: Date;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(value) && value.length >= 1) {
    const n = Number(value[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function dmsToDecimal(value: unknown, ref: unknown): number | null {
  if (!Array.isArray(value) || value.length < 3) return toFiniteNumber(value);
  const deg = Number(value[0]);
  const min = Number(value[1]);
  const sec = Number(value[2]);
  if (![deg, min, sec].every(Number.isFinite)) return null;
  let decimal = deg + min / 60 + sec / 3600;
  const hemisphere = String(ref || "").toUpperCase();
  if (hemisphere === "S" || hemisphere === "W") decimal = -decimal;
  return Number.isFinite(decimal) ? decimal : null;
}

/** Read original capture GPS/date from ImagePicker EXIF when the platform provides it. */
export function readGalleryExifLocation(exif: Record<string, unknown> | null | undefined): GalleryExifLocation | null {
  if (!exif || typeof exif !== "object") return null;

  const lat =
    toFiniteNumber(exif.GPSLatitude) ??
    toFiniteNumber(exif.latitude) ??
    dmsToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef);
  const lng =
    toFiniteNumber(exif.GPSLongitude) ??
    toFiniteNumber(exif.longitude) ??
    dmsToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef);

  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;

  let timestamp: Date | undefined;
  const rawDate = exif.DateTimeOriginal || exif.DateTime || exif.datetime;
  if (typeof rawDate === "string" && rawDate.trim()) {
    const normalized = rawDate.trim().replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) timestamp = parsed;
  }

  return { latitude: lat, longitude: lng, timestamp };
}
