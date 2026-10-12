import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

test("camera path requires a fresh GPS fix before accepting the photo", () => {
  const src = read("mobile/lib/visitEvidenceCapture.ts");
  const start = src.indexOf("export async function prepareCameraEvidence");
  const end = src.indexOf("\nexport ", start + 10);
  const body = src.slice(start, end);
  assert.match(body, /currentFix\(\)/, "camera capture reads a fresh GPS fix");
  assert.match(body, /if \(!fix \|\| fix\.latitude == null/, "missing fix rejects the photo");
  assert.match(
    body,
    /GPS is unavailable or inaccurate\. Please move to an open area and retry\./,
    "GPS failure shows the required retry message"
  );
  assert.match(body, /return null;/, "photo is not accepted without GPS");
});

test("camera evidence carries accuracy + capture timestamp through toVisitPhotoAsset", () => {
  const src = read("mobile/lib/visitEvidenceCapture.ts");
  const asset = src.slice(src.indexOf("export function toVisitPhotoAsset"));
  assert.match(asset, /accuracy: prepared\.meta\.accuracy/);
  assert.match(asset, /capturedAt: prepared\.meta\.evidenceTime\.toISOString\(\)/);
});

test("gallery/library picker is removed from visit evidence capture", () => {
  const capture = read("mobile/lib/visitEvidenceCapture.ts");
  assert.doesNotMatch(capture, /launchImageLibrary/, "no gallery launch helper");
  assert.doesNotMatch(capture, /prepareGalleryEvidence/, "no gallery preparation path");
  assert.doesNotMatch(capture, /readGalleryExifLocation/, "no EXIF-trusted gallery import");
  const pickers = read("src/visit/visitEvidencePickers.ts");
  assert.doesNotMatch(pickers, /launchImageLibraryAsync/, "visit pickers have no library branch");
  const step5 = read("mobile/app/visit/create-step3.tsx");
  assert.doesNotMatch(step5, /prepareGalleryEvidence|images-outline/, "step 5 has no gallery entry");
  const detail = read("mobile/app/visit/[id].tsx");
  assert.doesNotMatch(detail, /prepareGalleryEvidence|images-outline/, "visit edit has no gallery entry");
});

test("media uploads append server-validated capture metadata", () => {
  const meta = read("src/utils/visitEvidenceCaptureMeta.ts");
  for (const field of [
    "capture_source",
    "capture_latitude",
    "capture_longitude",
    "capture_accuracy_m",
    "captured_at"
  ]) {
    assert.ok(meta.includes(`"${field}"`), `metadata appends ${field}`);
  }
  assert.match(meta, /photo\.source === "camera"/, "source is declared to the server");
  const submit = read("mobile/lib/visitSubmitApi.ts");
  assert.match(submit, /appendCaptureMetaToForm\(formData, photo\)/, "submit upload sends capture meta");
  const detail = read("mobile/lib/visitDetailApi.ts");
  assert.match(detail, /appendCaptureMetaToForm\(formData, photo\)/, "edit-mode upload sends capture meta");
});

test("review submit is blocked without a camera photo and shows the required message", () => {
  const review = read("mobile/app/visit/create-step4-review.tsx");
  assert.match(review, /photo\.source === "camera"/, "gate counts only camera-sourced photos");
  assert.match(review, /noCameraPhoto/, "submit is disabled without camera evidence");
  assert.match(review, /visitFlow\.livePhotoRequired/, "required message is shown");
  const en = read("src/i18n/en.ts");
  assert.match(
    en,
    /livePhotoRequired: "Please capture a live field photo before completing this visit\."/,
    "exact required English message"
  );
  const ta = read("src/i18n/ta.ts");
  assert.match(ta, /livePhotoRequired:/, "Tamil translation exists");
});

test("evidence section component has no gallery option", () => {
  const section = read("src/components/visit/VisitEvidenceSection.tsx");
  assert.doesNotMatch(section, /images-outline|Gallery|gallery/i, "evidence section is camera-only");
});
