import { BRAND } from "../brand/constants";
import type { VisitPhotoWatermarkMeta } from "./visitPhotoWatermark";

type AddressParts = {
  village?: string | null;
  district?: string | null;
  land_name?: string | null;
  farmer_name?: string | null;
};

export function formatVisitAddress(parts: AddressParts): string {
  const segments = [parts.land_name, parts.village, parts.district, parts.farmer_name]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return segments.join(", ") || "Field location";
}

export function buildVisitPhotoWatermarkMeta(input: {
  values?: AddressParts;
  employeeName?: string | null;
  visitId?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}): VisitPhotoWatermarkMeta {
  const lat =
    input.latitude != null && input.latitude !== ""
      ? Number(input.latitude)
      : null;
  const lng =
    input.longitude != null && input.longitude !== ""
      ? Number(input.longitude)
      : null;

  const visitLabel =
    input.visitId != null && String(input.visitId).trim()
      ? `#${input.visitId}`
      : "Draft";

  return {
    address: formatVisitAddress(input.values ?? {}),
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    employeeName: input.employeeName?.trim() || BRAND.appName,
    visitId: visitLabel,
    capturedAt: new Date()
  };
}
