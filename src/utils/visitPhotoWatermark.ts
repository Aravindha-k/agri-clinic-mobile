import { BRAND } from "../brand/constants";

export type VisitPhotoWatermarkMeta = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  employeeName: string;
  visitId: string;
  capturedAt?: Date;
};

export function formatWatermarkCoordinates(lat: number | null, lng: number | null) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "GPS: Not captured";
  }
  return `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function buildVisitPhotoWatermarkLines(meta: VisitPhotoWatermarkMeta): string[] {
  const when = meta.capturedAt ?? new Date();
  const date = when.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const time = when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return [
    BRAND.appName,
    meta.address.trim() || "Address not recorded",
    formatWatermarkCoordinates(meta.latitude, meta.longitude),
    `${date} · ${time}`,
    meta.employeeName.trim() || "Field employee",
    `Visit ${meta.visitId}`
  ];
}
