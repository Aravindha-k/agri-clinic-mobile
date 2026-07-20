import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("uploadPendingFarmerPhotoIfNeeded is reachable from production paths", () => {
  const helper = read("src/visit/uploadPendingFarmerPhoto.ts");
  const prepare = read("src/visit/prepareVisitSubmit.ts");
  const flush = read("mobile/lib/sync/offlineSyncManager.ts");
  const orchestrator = read("mobile/lib/sync/syncOrchestrator.ts");

  assert.match(helper, /export async function uploadPendingFarmerPhotoIfNeeded/);
  assert.match(prepare, /uploadPendingFarmerPhotoIfNeeded/);
  assert.match(flush, /pendingFarmerPhoto/);
  assert.match(prepare, /pendingFarmerPhoto/);
  assert.match(orchestrator, /flushPendingFarmerPhotos/);
});

test("helper uses server farmer id and clears only after success path", () => {
  const helper = read("src/visit/uploadPendingFarmerPhoto.ts");
  assert.match(helper, /uploadFarmerPhoto\(Number\(id\), pending\)/);
  assert.match(helper, /clearPendingFarmerPhoto/);
  assert.match(helper, /enqueuePendingFarmerPhoto/);
  assert.match(helper, /inFlightByFarmer/);
});

test("pending farmer photo queue is user-scoped", () => {
  const queue = read("mobile/lib/sync/pendingFarmerPhotoQueue.ts");
  assert.match(queue, /user_id/);
  assert.match(queue, /filterQueueForActiveUser/);
  assert.match(queue, /quarantineOrphanQueueItems/);
});

test("session replace clears pending farmer photos", () => {
  const clear = read("src/storage/clearLocalFieldQueues.ts");
  assert.match(clear, /clearAllPendingFarmerPhotos/);
});

test("prepareVisitForSubmit invokes photo upload after farmer create", () => {
  const prepare = read("src/visit/prepareVisitSubmit.ts");
  assert.match(prepare, /createFarmer\(/);
  assert.match(prepare, /uploadPendingFarmerPhotoIfNeeded\(farmerId/);
  assert.match(prepare, /enqueueOnFailure:\s*true/);
});
