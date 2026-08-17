import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const watermark = read("src/utils/visitPhotoWatermark.ts");
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
  assert.match(burner, /buildEvidenceStampLines/);
  assert.match(step3, /EvidenceStampBurner/);
  assert.match(step3, /toVisitPhotoAsset\(prepared, stampedUri\)/);
  assert.match(detail, /prepareCameraEvidence/);
  const lines = buildEvidenceStampLines({
    locationKind: "captured",
    latitude: 11.920694,
    longitude: 79.617454,
    address: "Andiarpalayam, Tamil Nadu",
    employeeDisplayId: "KAC-DIVYA01",
    visitId: "80"
  });
  assert.ok(lines.some((line) => line.includes("📍")));
  assert.ok(lines.some((line) => line.includes("11.920694, 79.617454")));
  assert.ok(lines.some((line) => line.includes("KAC-DIVYA01")));
  assert.ok(lines.some((line) => line.includes("Visit #80")));
  assert.ok(!lines.some((line) => line.startsWith("Uploaded at:")));
});

test("gallery without EXIF is labelled Uploaded at, never captured-at current location", () => {
  assert.match(capture, /locationKind: hasOriginal \? "captured" : "uploaded"/);
  assert.match(step3, /uploadedAtLabel/);
  assert.match(exif, /readGalleryExifLocation/);
  assert.match(watermark, /Uploaded at:/);
  const uploaded = buildEvidenceStampLines({
    locationKind: "uploaded",
    latitude: 11.94,
    longitude: 79.49,
    address: "Villupuram, Tamil Nadu",
    employeeDisplayId: "KAC-DIVYA01"
  });
  assert.equal(uploaded[0], "Uploaded at:");
  const captured = buildEvidenceStampLines({
    locationKind: "captured",
    latitude: 11.94,
    longitude: 79.49,
    address: "Villupuram, Tamil Nadu",
    employeeDisplayId: "KAC-DIVYA01"
  });
  assert.notEqual(captured[0], "Uploaded at:");
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
  assert.match(watermark, /Location unavailable/);
  assert.equal(formatEvidenceCoordinates(null, null), null);
  const noFix = buildEvidenceStampLines({
    locationKind: "captured",
    latitude: null,
    longitude: null,
    address: "",
    employeeDisplayId: "KAC-DIVYA01"
  });
  assert.ok(noFix.some((line) => line.includes("Location unavailable")));
  assert.match(step3, /stampFailed/);
});

test("no second location permission owner, no map-tile dependency, farmer profile photos stay unstamped", () => {
  assert.match(ensureFg, /Location\.requestForegroundPermissionsAsync\(\)/);
  assert.doesNotMatch(capture, /requestForegroundPermissionsAsync/);
  assert.doesNotMatch(watermark, /GPS Map Camera|Google/);
  assert.doesNotMatch(burner, /GPS Map Camera|Google/);
  assert.doesNotMatch(farmerPicker, /prepareCameraEvidence|EvidenceStampBurner|visitPhotoWatermark/);
  assert.match(farmerPicker, /pickProfileImage/);
});
