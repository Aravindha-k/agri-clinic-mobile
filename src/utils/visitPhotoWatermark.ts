import { BRAND } from "../brand/constants";
import { formatIndiaDateTime } from "./indiaDateTime";

export type EvidencePhotoSource = "camera" | "gallery";
export type EvidenceLocationKind = "captured" | "uploaded";

export type EvidenceStampMeta = {
  source: EvidencePhotoSource;
  locationKind: EvidenceLocationKind;
  evidenceTime: Date;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
  employeeDisplayId: string;
  visitId?: string;
  farmerName?: string;
};

export function formatEvidenceCoordinates(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function formatEvidenceDateTime(when: Date): string {
  return formatIndiaDateTime(when);
}

function locationHeadline(meta: EvidenceStampMeta, coords: string | null): string {
  const address = meta.address.trim();
  if (address) return address;
  if (coords) return coords;
  return "Location unavailable";
}

/** Shared formatter for preview overlay and burned-in watermark. */
export function buildEvidenceStampLines(meta: EvidenceStampMeta): string[] {
  const coords = formatEvidenceCoordinates(meta.latitude, meta.longitude);
  const pinLine = `📍 ${locationHeadline(meta, coords)}`;
  const lines: string[] = [];

  if (meta.locationKind === "uploaded") {
    lines.push("Uploaded at:");
  }

  lines.push(pinLine);
  if (coords && meta.address.trim()) {
    lines.push(coords);
  }
  lines.push(formatEvidenceDateTime(meta.evidenceTime));

  const identity = [meta.employeeDisplayId.trim(), BRAND.appName || "Kavya Agri Clinic"].filter(Boolean);
  if (identity.length) {
    lines.push(identity.join(" · "));
  }
  if (meta.visitId?.trim()) {
    lines.push(`Visit #${meta.visitId.trim()}`);
  }
  if (meta.farmerName?.trim()) {
    lines.push(meta.farmerName.trim());
  }
  return lines;
}

export function employeeWatermarkId(employee: {
  employee_id?: string | null;
  username?: string | null;
  full_name?: string | null;
  name?: string | null;
} | null): string {
  if (!employee) return "";
  return (
    String(employee.employee_id || "").trim() ||
    String(employee.username || "").trim() ||
    String(employee.full_name || employee.name || "").trim()
  );
}

/** @deprecated Use buildEvidenceStampLines */
export type VisitPhotoWatermarkMeta = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  employeeName: string;
  visitId: string;
  capturedAt?: Date;
};

/** @deprecated Use buildEvidenceStampLines */
export function formatWatermarkCoordinates(lat: number | null, lng: number | null) {
  const coords = formatEvidenceCoordinates(lat, lng);
  return coords ? `GPS: ${coords}` : "GPS: Not captured";
}

/** @deprecated Use buildEvidenceStampLines */
export function buildVisitPhotoWatermarkLines(meta: VisitPhotoWatermarkMeta): string[] {
  return buildEvidenceStampLines({
    source: "camera",
    locationKind: "captured",
    evidenceTime: meta.capturedAt ?? new Date(),
    latitude: meta.latitude,
    longitude: meta.longitude,
    accuracy: null,
    address: meta.address,
    employeeDisplayId: meta.employeeName,
    visitId: meta.visitId
  });
}
