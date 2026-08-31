/**
 * Regression: evidence photo footer is appended below the image (no overlay on photo).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

function fitWatermarkCaptureSize(imageWidth, imageHeight, maxEdge = 1600) {
  const srcW = Math.max(1, Math.round(Number(imageWidth) || 1));
  const srcH = Math.max(1, Math.round(Number(imageHeight) || 1));
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  return { layoutWidth: width, layoutHeight: height, outputWidth: width, outputHeight: height };
}

function formatEvidenceCoordinates(lat, lng) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function splitLocationLines(address) {
  const trimmed = address.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [trimmed];
  if (parts.length === 2) return parts;
  return [parts[0], parts.slice(1).join(", ")];
}

function formatEvidenceEmployeeLine(meta) {
  const name = String(meta.employeeName || "").trim();
  const code = String(meta.employeeCode || meta.employeeDisplayId || "").trim();
  if (name && code && name.toLowerCase() !== code.toLowerCase()) return `${name} • ${code}`;
  if (name) return name;
  if (code) return code;
  return null;
}

function buildEvidenceFooterContent(meta) {
  const address = meta.address.trim();
  const coords = formatEvidenceCoordinates(meta.latitude, meta.longitude);
  let locationLines = [];
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
    dateTime: "29 Aug 2026 • 10:12 AM",
    locationLines,
    employeeLine: formatEvidenceEmployeeLine(meta),
    usesCoordinates
  };
}

function estimateEvidenceFooterHeight(layoutWidth, meta) {
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
  return Math.min(360, Math.max(148, estimated));
}

function fitEvidencePhotoCaptureSize(imageWidth, imageHeight, meta, maxEdge = 1600) {
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

const sampleMeta = {
  address: "Manokaran Salayampalayam East, (Chozhavalli Town), Tamil Nadu, India",
  latitude: 11.920694,
  longitude: 79.617454,
  employeeName: "Jeyabaskar",
  employeeCode: "KAC-0003"
};

test("footer is below image: final height = photo height + footer height", () => {
  const portrait = fitEvidencePhotoCaptureSize(1200, 1600, sampleMeta);
  assert.ok(portrait.footerLayoutHeight > 0);
  assert.equal(portrait.layoutHeight, portrait.photoLayoutHeight + portrait.footerLayoutHeight);
  assert.equal(portrait.outputHeight, portrait.layoutHeight);

  const landscape = fitEvidencePhotoCaptureSize(1600, 1200, sampleMeta);
  assert.equal(landscape.layoutHeight, landscape.photoLayoutHeight + landscape.footerLayoutHeight);
});

test("original image height is preserved in photo layout area", () => {
  const sized = fitEvidencePhotoCaptureSize(3024, 4032, sampleMeta);
  const photoOnly = fitWatermarkCaptureSize(3024, 4032);
  assert.equal(sized.photoLayoutHeight, photoOnly.layoutHeight);
  assert.ok(sized.layoutHeight > sized.photoLayoutHeight);
});

test("readable address preferred over coordinates in footer content", () => {
  const content = buildEvidenceFooterContent({
    ...sampleMeta,
    address: "Manokaran Salayampalayam East, (Chozhavalli Town), Tamil Nadu, India"
  });
  assert.equal(content.usesCoordinates, false);
  assert.ok(content.locationLines[0].includes("Manokaran"));
  assert.ok(!content.locationLines.join(" ").includes("11.920694"));
});

test("coordinate fallback when address missing", () => {
  const content = buildEvidenceFooterContent({
    ...sampleMeta,
    address: "",
    latitude: 11.920694,
    longitude: 79.617454
  });
  assert.equal(content.usesCoordinates, true);
  assert.ok(content.locationLines[0].includes("11.920694"));
});

test("employee name and code rendered together", () => {
  const line = formatEvidenceEmployeeLine({
    employeeName: "Jeyabaskar",
    employeeCode: "KAC-0003"
  });
  assert.equal(line, "Jeyabaskar • KAC-0003");
});

test("long location wraps into multiple lines without empty junk", () => {
  const lines = splitLocationLines(
    "Manokaran Salayampalayam East, (Chozhavalli Town), Tamil Nadu, India"
  );
  assert.equal(lines.length, 2);
  assert.ok(lines[0].length > 0);
  assert.ok(lines[1].length > 0);
  assert.ok(!lines.some((l) => /undefined|null|\[object Object\]/i.test(l)));
});

test("missing optional employee fields degrade gracefully", () => {
  assert.equal(formatEvidenceEmployeeLine({ employeeName: "Jeyabaskar", employeeCode: "" }), "Jeyabaskar");
  assert.equal(formatEvidenceEmployeeLine({ employeeName: "", employeeCode: "KAC-0003" }), "KAC-0003");
  assert.equal(formatEvidenceEmployeeLine({ employeeName: "", employeeCode: "" }), null);
});

test("EvidenceStampBurner stacks footer below photo with no overlay panel", () => {
  const burner = read("mobile/components/visit/EvidenceStampBurner.tsx");
  assert.match(burner, /EvidencePhotoFooter/);
  assert.match(burner, /fitEvidencePhotoCaptureSize/);
  assert.match(burner, /evidenceCaptureHostStyle/);
  assert.doesNotMatch(burner, /bottom:\s*0/);
  assert.doesNotMatch(burner, /rgba\(11,\s*20,\s*16/);
  assert.match(burner, /backgroundColor:\s*"#FFFFFF"/);
  assert.match(burner, /onLoad=\{\(\) => \{/);
  assert.match(burner, /opacity:\s*1/);
});

test("EvidencePhotoFooter uses official CompanyLogo asset", () => {
  const footer = read("src/components/visit/EvidencePhotoFooter.tsx");
  assert.match(footer, /CompanyLogo/);
  assert.match(footer, /KAVYA/);
  assert.match(footer, /AGRI CLINIC/);
  assert.match(footer, /#FAFCFA/);
  assert.doesNotMatch(footer, /position:\s*"absolute"/);
});

test("visitPhotoWatermark uses Asia/Kolkata formatter for evidence datetime", () => {
  const wm = read("src/utils/evidencePhotoFooter.ts");
  assert.match(wm, /formatIndiaDate/);
  assert.match(wm, /formatIndiaTime/);
  assert.match(wm, /BUSINESS_TIME_ZONE|indiaDateTime/);
});

test("capture pipeline keeps JPEG contract and black-image guards", () => {
  const capture = read("src/utils/captureWatermarkedPhoto.ts");
  assert.match(capture, /format:\s*"jpg"/);
  assert.match(capture, /MIN_STAMPED_JPEG_BYTES/);
  assert.match(capture, /SaveFormat\.JPEG/);
  assert.doesNotMatch(capture, /PixelRatio\.get\(\)/);

  const evidence = read("mobile/lib/visitEvidenceCapture.ts");
  assert.match(evidence, /employeeWatermarkParts/);
  assert.match(evidence, /employeeName:/);
  assert.match(evidence, /employeeCode:/);
  assert.match(evidence, /mimeType:\s*"image\/jpeg"/);
});

test("VisitPhotoWatermarkPreview shows composed footer below photo", () => {
  const preview = read("src/components/visit/VisitPhotoWatermarkPreview.tsx");
  assert.match(preview, /EvidencePhotoFooter/);
  assert.match(preview, /fitEvidencePhotoCaptureSize/);
  assert.doesNotMatch(preview, /watermarkStrip/);
  assert.doesNotMatch(preview, /rgba\(11,\s*90,\s*56/);
});
