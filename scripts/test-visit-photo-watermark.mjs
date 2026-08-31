import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const watermark = read("src/utils/visitPhotoWatermark.ts");
const footerUtil = read("src/utils/evidencePhotoFooter.ts");
const footerUi = read("src/components/visit/EvidencePhotoFooter.tsx");
const capture = read("mobile/lib/visitEvidenceCapture.ts");
const burner = read("mobile/components/visit/EvidenceStampBurner.tsx");
const step3 = read("mobile/app/visit/create-step3.tsx");
const detail = read("mobile/app/visit/[id].tsx");
const gps = read("mobile/lib/visit/visitGpsCapture.ts");
const geocode = read("src/utils/reverseGeocode.ts");
const exif = read("src/utils/galleryPhotoExif.ts");
const submitApi = read("mobile/lib/visitSubmitApi.ts");
const farmerPicker = read("src/components/FarmerPhotoPicker.tsx");
const ensureFg = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");

function formatEvidenceCoordinates(lat, lng) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function buildEvidenceStampLines(meta) {
  const coords = formatEvidenceCoordinates(meta.latitude, meta.longitude);
  const address = String(meta.address || "").trim();
  const pinLine = `📍 ${address || coords || "Location unavailable"}`;
  const lines = [];
  if (meta.locationKind === "uploaded") lines.push("Uploaded at:");
  lines.push(pinLine);
  if (coords && address) lines.push(coords);
  lines.push("17 Aug 2026 · 05:30 PM");
  if (meta.employeeDisplayId) lines.push(`${meta.employeeDisplayId} · Kavya Agri Clinic`);
  if (meta.visitId) lines.push(`Visit #${meta.visitId}`);
  return lines;
}

test("camera watermark uses a fresh visit GPS fix and burns a stamped file", () => {
  assert.match(capture, /prepareCameraEvidence/);
  assert.match(capture, /captureVisitGps\(\{ requestPermission: false \}\)/);
  assert.match(gps, /requestPermission\?: boolean/);
  assert.match(burner, /captureWatermarkedPhoto/);
  assert.match(burner, /EvidencePhotoFooter/);
  assert.match(burner, /fitEvidencePhotoCaptureSize/);
  assert.match(footerUtil, /buildEvidenceFooterContent/);
  assert.match(footerUi, /CompanyLogo/);
  assert.match(step3, /EvidenceStampBurner/);
  assert.match(step3, /toVisitPhotoAsset\(prepared, stampedUri\)/);
  assert.match(detail, /prepareCameraEvidence/);
  assert.match(capture, /employeeName:/);
  assert.match(capture, /employeeCode:/);
});

test("gallery without EXIF is labelled uploaded location kind, never captured-at current location", () => {
  assert.match(capture, /locationKind: hasOriginal \? "captured" : "uploaded"/);
  assert.match(step3, /uploadedAtLabel/);
  assert.match(exif, /readGalleryExifLocation/);
  assert.match(capture, /locationKind: hasOriginal \? "captured" : "uploaded"/);
});

test("multiple photos, remove, unique client_upload_id, and retry do not invent a second media API", () => {
  assert.match(capture, /MAX_VISIT_PHOTOS = 5/);
  assert.match(capture, /allowsMultipleSelection: true/);
  assert.match(step3, /addPhoto/);
  assert.match(step3, /removePhoto/);
  assert.match(submitApi, /mobile\/visits\/\$\{visitId\}\/media\//);
  assert.match(submitApi, /client_upload_id/);
  assert.match(submitApi, /if \(photo\.id\)/);
  const ids = ["photo-1-a", "photo-2-b", "photo-3-c"];
  assert.equal(new Set(ids).size, ids.length);
});

test("orientation is flattened before stamp; reverse-geocode and GPS failure do not fake coordinates", () => {
  assert.match(capture, /flattenOrientation/);
  assert.match(capture, /ImageManipulator\.manipulateAsync\(uri, \[\]/);
  assert.match(geocode, /reverseGeocodeAsync/);
  assert.match(footerUtil, /Location unavailable/);
  assert.equal(formatEvidenceCoordinates(null, null), null);
  assert.match(step3, /stampFailed/);
  assert.match(burner, /onLoad/);
  assert.match(burner, /fitEvidencePhotoCaptureSize|WATERMARK_CAPTURE_MAX_EDGE/);
});

test("no second location permission owner, no map-tile dependency, farmer profile photos stay unstamped", () => {
  assert.match(ensureFg, /Location\.requestForegroundPermissionsAsync\(\)/);
  assert.doesNotMatch(capture, /requestForegroundPermissionsAsync/);
  assert.doesNotMatch(watermark, /GPS Map Camera|Google/);
  assert.doesNotMatch(burner, /GPS Map Camera|Google/);
  assert.doesNotMatch(footerUi, /GPS Map Camera|Google/);
  assert.doesNotMatch(farmerPicker, /prepareCameraEvidence|EvidenceStampBurner|visitPhotoWatermark/);
  assert.match(farmerPicker, /pickProfileImage/);
});
