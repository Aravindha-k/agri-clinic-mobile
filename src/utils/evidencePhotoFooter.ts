import { formatIndiaDate, formatIndiaTime } from "./indiaDateTime";
import {
  fitWatermarkCaptureSize,
  WATERMARK_CAPTURE_MAX_EDGE,
  type CaptureLayoutSize
} from "./watermarkCaptureLayout";
import {
  formatEvidenceCoordinates,
  type EvidenceStampMeta
} from "./visitPhotoWatermark";

export type EvidenceFooterContent = {
  dateTime: string;
  locationLines: string[];
  employeeLine: string | null;
  usesCoordinates: boolean;
};

/** Evidence footer datetime: "29 Aug 2026 • 10:12 AM" (Asia/Kolkata). */
export function formatEvidenceFooterDateTime(when: Date): string {
  const date = formatIndiaDate(when);
  const time = formatIndiaTime(when).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  if (date === "—" || time === "—") return "Not recorded";
  return `${date} • ${time}`;
}

export function splitLocationLines(address: string): string[] {
  const trimmed = address.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [trimmed];
  if (parts.length === 2) return parts;
  return [parts[0], parts.slice(1).join(", ")];
}

export function formatEvidenceEmployeeLine(meta: EvidenceStampMeta): string | null {
  const name = String(meta.employeeName || "").trim();
  const code = String(meta.employeeCode || meta.employeeDisplayId || "").trim();
  if (name && code && name.toLowerCase() !== code.toLowerCase()) {
    return `${name} • ${code}`;
  }
  if (name) return name;
  if (code) return code;
  return null;
}

export function buildEvidenceFooterContent(meta: EvidenceStampMeta): EvidenceFooterContent {
  const address = meta.address.trim();
  const coords = formatEvidenceCoordinates(meta.latitude, meta.longitude);

  let locationLines: string[] = [];
  let usesCoordinates = false;

  if (address) {
    locationLines = splitLocationLines(address);
  } else if (coords) {
    locationLines = [coords];
    usesCoordinates = true;
  } else {
    locationLines = ["Location unavailable"];
  }

  return {
    dateTime: formatEvidenceFooterDateTime(meta.evidenceTime),
    locationLines,
    employeeLine: formatEvidenceEmployeeLine(meta),
    usesCoordinates
  };
}

const FOOTER_MIN_HEIGHT = 148;
const FOOTER_MAX_HEIGHT = 360;

/** Estimate footer block height at the scaled capture width (same units as layout). */
export function estimateEvidenceFooterHeight(layoutWidth: number, meta: EvidenceStampMeta): number {
  const width = Math.max(1, Math.round(layoutWidth));
  const content = buildEvidenceFooterContent(meta);
  const pad = Math.max(14, Math.round(width * 0.028));
  const lineHeight = Math.max(18, Math.round(width * 0.026));
  const brandBlock = Math.max(72, Math.round(width * 0.12));
  const dateBlock = lineHeight + 4;
  const locationBlock = content.locationLines.length * (lineHeight + 2) + 4;
  const employeeBlock = content.employeeLine ? lineHeight + 6 : 0;
  const separator = 3;
  const estimated =
    separator + pad * 2 + Math.max(brandBlock, dateBlock + locationBlock + employeeBlock);
  return Math.min(FOOTER_MAX_HEIGHT, Math.max(FOOTER_MIN_HEIGHT, estimated));
}

export type EvidencePhotoCaptureSize = CaptureLayoutSize & {
  photoLayoutHeight: number;
  footerLayoutHeight: number;
};

/** Scale photo to max edge, then append footer below — final height = photo + footer. */
export function fitEvidencePhotoCaptureSize(
  imageWidth: number,
  imageHeight: number,
  meta: EvidenceStampMeta,
  maxEdge = WATERMARK_CAPTURE_MAX_EDGE
): EvidencePhotoCaptureSize {
  const photo = fitWatermarkCaptureSize(imageWidth, imageHeight, maxEdge);
  const footerLayoutHeight = estimateEvidenceFooterHeight(photo.layoutWidth, meta);
  const totalHeight = photo.layoutHeight + footerLayoutHeight;
  return {
    layoutWidth: photo.layoutWidth,
    layoutHeight: totalHeight,
    outputWidth: photo.outputWidth,
    outputHeight: totalHeight,
    photoLayoutHeight: photo.layoutHeight,
    footerLayoutHeight
  };
}
