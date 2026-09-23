/**
 * Field interactions, multi-evidence append, and Work edit refresh.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

test("ActionTile exposes tactile states without a second icon library", () => {
  const tile = read("mobile/components/ui/ActionTile.tsx");
  assert.match(tile, /ActionTileState/);
  assert.match(tile, /scaleTo=\{0\.96\}/);
  assert.match(tile, /usePremiumMotion|PressableCard/);
  assert.match(tile, /Ionicons/);
  assert.doesNotMatch(tile, /lottie|three|webgl/i);
});

test("visit step indicator keeps 4 steps with Farmer/Problem/Evidence/Review", () => {
  const step = read("mobile/components/visit/StepIndicator.tsx");
  assert.match(step, /stepLabelFarmer/);
  assert.match(step, /stepLabelProblem/);
  assert.match(step, /stepLabelEvidence/);
  assert.match(step, /stepLabelReview/);
  assert.match(step, /checkmark/);
  assert.match(step, /usePremiumMotion/);
});

test("camera and gallery append photos — they do not replace", () => {
  const store = read("mobile/store/visitFormStore.ts");
  const capture = read("mobile/lib/visitEvidenceCapture.ts");
  const step3 = read("mobile/app/visit/create-step3.tsx");
  assert.match(store, /\[\.\.\.state\.photos, photo\]/);
  assert.match(capture, /allowsMultipleSelection/);
  assert.match(capture, /materializeLocalImage/);
  assert.match(capture, /prepareGalleryEvidence/);
  assert.match(step3, /addPhoto\(/);
  assert.match(step3, /ActionTile/);
  assert.match(step3, /camera-outline/);
  assert.match(step3, /images-outline/);
  assert.doesNotMatch(step3, /setPhotos\(\[prepared\]\)/);
  assert.doesNotMatch(step3, /videocam/);
});

test("backend media allowlist has no video — Mobile must not fake video", () => {
  const files = read("src/utils/visitAttachmentFiles.ts");
  const attach = read("src/api/visitAttachments.ts");
  assert.match(files, /image\/jpeg/);
  assert.match(files, /application\/pdf/);
  assert.match(files, /audio\/mpeg/);
  assert.doesNotMatch(files, /video\/mp4/);
  assert.doesNotMatch(attach, /attachment_type.*video|"video"/);
});

test("edit save navigates back only after success and refreshes history/work", () => {
  const detail = read("mobile/app/visit/[id].tsx");
  const history = read("mobile/app/farmer/visit-history.tsx");
  const farmer = read("mobile/app/farmer/[id].tsx");
  const refresh = read("src/storage/FieldDataRefreshContext.tsx");
  assert.match(detail, /await patchMobileVisit/);
  assert.match(detail, /bumpAfterVisitChange\(\)/);
  assert.match(detail, /navigation\.goBack\(\)/);
  assert.match(detail, /Alert\.alert\("Save failed"/);
  assert.match(history, /visitsVersion/);
  assert.match(history, /useFocusEffect/);
  assert.match(history, /reloadFirstPage/);
  assert.match(farmer, /visitsVersion/);
  assert.match(farmer, /useFocusEffect/);
  assert.match(refresh, /setFarmersVersion/);
  const saveBlock = detail.slice(detail.indexOf("async function handleSave"), detail.indexOf("function runNextStamp"));
  const failIdx = saveBlock.indexOf("Save failed");
  const goBackAfterFail = saveBlock.slice(failIdx).includes("goBack");
  assert.equal(goBackAfterFail, false);
});

test("unfinished visit remains Continue/Cancel only; no Draft UI", () => {
  const guard = read("mobile/lib/visitLeaveGuard.ts");
  const shell = read("mobile/app/visit/index.tsx");
  assert.match(guard, /continueVisit/);
  assert.match(guard, /cancelVisit/);
  assert.doesNotMatch(guard, /saveDraft/);
  assert.doesNotMatch(shell, /saveDraft/);
});

test("offline and revisit still key media by local_sync_id", () => {
  const store = read("mobile/store/visitFormStore.ts");
  const begin = read("mobile/lib/beginNewVisit.ts");
  const persist = read("mobile/lib/media/persistentVisitPhotos.ts");
  assert.match(store, /submissionLocalSyncId/);
  assert.match(begin, /ensureLocalSyncId\(\)/);
  assert.match(begin, /cleanupDraftMedia/);
  assert.match(persist, /visitLocalSyncId/);
});
