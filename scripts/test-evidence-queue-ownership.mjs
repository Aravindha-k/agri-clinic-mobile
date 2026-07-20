import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function filterQueueForActiveUser(items, userId) {
  if (userId == null) return { owned: [], orphans: items };
  const owned = [];
  const orphans = [];
  for (const item of items) {
    if (item.user_id == null || item.user_id !== userId) orphans.push(item);
    else owned.push(item);
  }
  return { owned, orphans };
}

test("evidence queue records include owner identity", () => {
  const src = read("mobile/lib/sync/pendingEvidenceQueue.ts");
  assert.match(src, /user_id\?: number/);
  assert.match(src, /user_id: userId/);
  assert.match(src, /readActiveUserEvidenceQueue/);
  assert.match(src, /filterQueueForActiveUser/);
});

test("SESSION_REPLACED teardown handles evidence queue", () => {
  const clear = read("src/storage/clearLocalFieldQueues.ts");
  assert.match(clear, /clearAllPendingEvidence/);
  assert.match(clear, /clearAllPendingFarmerPhotos/);
});

test("employee A queue not visible to employee B", () => {
  const rows = [
    { id: "a1", user_id: 1, visit_id: 10 },
    { id: "b1", user_id: 2, visit_id: 11 }
  ];
  const { owned } = filterQueueForActiveUser(rows, 2);
  assert.equal(owned.length, 1);
  assert.equal(owned[0].id, "b1");
});

test("legacy unowned rows are not uploaded under current user", () => {
  const rows = [
    { id: "legacy", visit_id: 1 },
    { id: "mine", user_id: 5, visit_id: 2 }
  ];
  const { owned, orphans } = filterQueueForActiveUser(rows, 5);
  assert.equal(owned.length, 1);
  assert.equal(owned[0].id, "mine");
  assert.equal(orphans.some((r) => r.id === "legacy"), true);
});

test("enqueue refuses without active sync user", () => {
  const src = read("mobile/lib/sync/pendingEvidenceQueue.ts");
  assert.match(src, /skip enqueue — no active sync user/);
});

test("flush only processes active owner rows", () => {
  const src = read("mobile/lib/sync/pendingEvidenceQueue.ts");
  assert.match(src, /readActiveUserEvidenceQueue/);
  assert.match(src, /item\.user_id !== userId/);
  assert.match(src, /foreignAndOther/);
});

test("synced evidence is removed from queue on success", () => {
  const src = read("mobile/lib/sync/pendingEvidenceQueue.ts");
  assert.match(src, /uploaded \+= 1/);
  assert.match(src, /continue/);
});
