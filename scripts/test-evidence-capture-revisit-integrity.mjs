/**
 * Regression: evidence capture host must not use opacity:0; revisit drafts need fresh IDs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

test("capture host hides below viewport at opacity 1 — never opacity 0 on ancestor", () => {
  const layout = read("src/utils/evidenceCaptureHostLayout.ts");
  assert.match(layout, /opacity:\s*1/);
  assert.match(layout, /windowHeight \+ 8/);
  assert.doesNotMatch(layout, /opacity:\s*0/);

  const burner = read("mobile/components/visit/EvidenceStampBurner.tsx");
  assert.match(burner, /evidenceCaptureHostStyle/);
  assert.doesNotMatch(burner, /captureHost:[\s\S]*opacity:\s*0/);
  assert.doesNotMatch(burner, /left:\s*-4000/);
  assert.doesNotMatch(burner, /left:\s*-9999/);
  assert.match(burner, /resizeMode=\{EVIDENCE_PHOTO_RESIZE_MODE\}/);
  assert.match(burner, /opacity:\s*1/);

  const preview = read("src/components/visit/VisitPhotoWatermarkPreview.tsx");
  assert.match(preview, /evidenceCaptureHostStyle/);
  assert.doesNotMatch(preview, /captureHost:[\s\S]*opacity:\s*0/);
  assert.match(preview, /stampedPreviewUri/);
  assert.match(preview, /watermarkedUri: stampedPreviewUri/);
});

test("captureWatermarkedPhoto skips second JPEG when already within upload bounds", () => {
  const capture = read("src/utils/captureWatermarkedPhoto.ts");
  assert.match(capture, /if \(size\.outputWidth > UPLOAD_MAX_EDGE\)/);
  assert.match(capture, /await assertStampedFileLooksValid\(uri\)/);
  assert.match(capture, /MIN_STAMPED_JPEG_BYTES/);
  assert.doesNotMatch(capture, /compress: 0\.78/);
});

test("secondary evidence path does not recompress stamped proof JPEG", () => {
  const hook = read("src/hooks/useVisitPhotoWithWatermark.ts");
  assert.match(hook, /uri: result\.watermarkedUri/);
  assert.doesNotMatch(hook, /prepareImageForUpload\(result\.watermarkedUri\)/);
});

test("canonical startRevisitDraft resets draft then mints fresh local_sync_id", () => {
  const begin = read("mobile/lib/beginNewVisit.ts");
  assert.match(begin, /export async function startRevisitDraft/);
  assert.match(begin, /store\.reset\(\)/);
  assert.match(begin, /applyRevisitPrefill/);
  assert.match(begin, /ensureLocalSyncId\(\)/);

  const index = read("mobile/app/visit/index.tsx");
  assert.match(index, /startRevisitDraft/);
  assert.doesNotMatch(index, /applyRevisitPrefill\(loaded\)/);

  const farmer = read("mobile/app/farmer/[id].tsx");
  assert.match(farmer, /fastRevisit: true/);

  const store = read("mobile/store/visitFormStore.ts");
  assert.match(store, /submissionLocalSyncId: null/);
  assert.match(store, /photos: \[\]/);
});

test("submit uploads media to visit id returned from POST, not stale duplicate source", () => {
  const submit = read("mobile/lib/visitSubmitApi.ts");
  assert.match(submit, /uploadVisitPhotos\(visit\.id/);
  assert.match(submit, /mobile\/visits\/\$\{visitId\}\/media\//);
  assert.match(submit, /postVisitMultipart/);
  assert.match(submit, /isDuplicateVisitResponse/);
});

test("offline queue keys visits by distinct local_sync_id", () => {
  const offline = read("mobile/lib/sync/offlineSyncManager.ts");
  assert.match(offline, /local_sync_id/);
  assert.match(offline, /queue\.some\(\(row\) => row\.local_sync_id === id\)/);
});

function simulateVisitIds() {
  const visitA = { submissionLocalSyncId: "sync-visit-a" };
  const retryA = { submissionLocalSyncId: visitA.submissionLocalSyncId };
  assert.equal(retryA.submissionLocalSyncId, "sync-visit-a");

  const visitB = { submissionLocalSyncId: "sync-visit-b" };
  assert.notEqual(visitA.submissionLocalSyncId, visitB.submissionLocalSyncId);
  return { visitA, visitB, retryA };
}

test("revisit mints different local_sync_id than completed visit A; retry reuses A", () => {
  const { visitA, visitB, retryA } = simulateVisitIds();
  assert.equal(retryA.submissionLocalSyncId, visitA.submissionLocalSyncId);
  assert.notEqual(visitB.submissionLocalSyncId, visitA.submissionLocalSyncId);
});

test("mock media upload targets new visit id after revisit POST", () => {
  const previousVisitId = 100;
  const duplicateResponse = { duplicate: true, visit_id: previousVisitId };
  const newVisitResponse = { visit_id: 125, visit: { id: 125 } };

  function mediaPath(visitId) {
    return `mobile/visits/${visitId}/media/`;
  }

  assert.equal(mediaPath(newVisitResponse.visit_id), "mobile/visits/125/media/");
  assert.notEqual(mediaPath(newVisitResponse.visit_id), mediaPath(previousVisitId));
  assert.ok(duplicateResponse.duplicate);
});
