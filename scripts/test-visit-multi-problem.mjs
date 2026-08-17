import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const store = read("mobile/store/visitFormStore.ts");
const step2 = read("mobile/app/visit/create-step2.tsx");
const review = read("mobile/app/visit/create-step4-review.tsx");
const detail = read("mobile/app/visit/[id].tsx");
const submitApi = read("mobile/lib/visitSubmitApi.ts");
const format = read("src/utils/format.ts");
const problems = read("src/utils/visitProblems.ts");
const catalog = read("mobile/lib/problemCatalog.ts");
const filter = read("src/utils/problemItemFilter.ts");
const queue = read("mobile/lib/pendingVisitsQueue.ts");
const flattenSrc = read("mobile/lib/visitSubmitApi.ts");

function collectVisitProblems(visit) {
  const fromArray = Array.isArray(visit?.problems) ? visit.problems : [];
  const seen = new Set();
  const out = [];
  for (const row of fromArray) {
    const id = row.id != null ? String(row.id) : "";
    const name = String(row.name || row.tamil_name || "").trim();
    const key = id || name.toLowerCase();
    if (!id && !name) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: id || name, name: name || `#${id}` });
  }
  if (out.length) return out;
  const nested = visit?.field_visit?.problem_master;
  const legacyId = visit?.problem_master_id ?? nested?.id;
  const name = String(nested?.name || visit?.problem_seen || "").trim();
  if (!legacyId && !name) return [];
  return [{ id: legacyId ?? name, name: name || `#${legacyId}` }];
}

function revalidateProblemSelection(selected, cropId) {
  const kept = [];
  const removed = [];
  for (const item of selected) {
    if (item.crop == null || String(item.crop) === cropId) kept.push(item);
    else removed.push(item);
  }
  return { kept, removed };
}

function flattenPayload(values) {
  const flat = {};
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      flat[key] = value.map(String);
      continue;
    }
    flat[key] = String(value);
  }
  return flat;
}

function appendVisitMultipartFields(fields) {
  const appended = [];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== "") appended.push([key, item]);
      }
      continue;
    }
    if (value !== "") appended.push([key, value]);
  }
  return appended;
}

test("crop-aware multi-select problems are grouped from backend items", () => {
  assert.match(step2, /toggleProblemItem/);
  assert.match(step2, /groupProblemsByCategory/);
  assert.match(step2, /selectedCount/);
  assert.match(step2, /clearSelected/);
  assert.match(catalog, /groupProblemsByCategory/);
  assert.match(filter, /problemItemMatchesCrop/);
  assert.doesNotMatch(step2, /Sathupatrakurai|சத்துப்பற்றாக்குறை/);
  assert.doesNotMatch(catalog, /Sathupatrakurai|சத்துப்பற்றாக்குறை/);
});

test("selected problems persist across steps and crop change drops incompatible ids", () => {
  assert.match(store, /selectedProblems: state\.selectedProblems/);
  assert.match(store, /revalidateProblemSelection/);
  assert.match(step2, /problemsRemoved/);
  const { kept, removed } = revalidateProblemSelection(
    [
      { id: 3, crop: 10 },
      { id: 7, crop: null },
      { id: 12, crop: 99 }
    ],
    "10"
  );
  assert.deepEqual(
    kept.map((row) => row.id),
    [3, 7]
  );
  assert.deepEqual(
    removed.map((row) => row.id),
    [12]
  );
});

test("review lists all selected problems; visit reopen prefers problems[] with legacy fallback", () => {
  assert.match(review, /problemsObservedCount/);
  assert.match(review, /selectedProblems/);
  assert.match(detail, /collectVisitProblems/);
  const multi = collectVisitProblems({
    problems: [
      { id: 3, name: "Yellow Stem Borer" },
      { id: 3, name: "Yellow Stem Borer" },
      { id: 7, name: "Leaf Folder" }
    ],
    problem_seen: "Yellow Stem Borer"
  });
  assert.deepEqual(
    multi.map((row) => row.name),
    ["Yellow Stem Borer", "Leaf Folder"]
  );
  const legacy = collectVisitProblems({
    problem_master_id: 9,
    problem_seen: "Old pest",
    field_visit: { problem_master: { id: 9, name: "Old pest" } }
  });
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].name, "Old pest");
});

test("offline queue preserves problem_item_ids as a number array, never a CSV string", () => {
  assert.match(submitApi, /problem_item_ids: isOther \? \[\] : problemItemIds/);
  assert.match(format, /payload\.problem_item_ids = problemItemIds/);
  assert.match(flattenSrc, /if \(Array\.isArray\(value\)\)/);
  assert.match(flattenSrc, /formData\.append\(key, item\)/);
  assert.match(queue, /\.\.\.record\.values/);
  const queued = {
    farmer: 1,
    crop: 84,
    problem_item_ids: [3, 7, 12]
  };
  const json = JSON.stringify(queued);
  assert.match(json, /"problem_item_ids":\[3,7,12\]/);
  assert.doesNotMatch(json, /"3,7,12"/);
  const restored = JSON.parse(json);
  assert.deepEqual(restored.problem_item_ids, [3, 7, 12]);
  const flat = flattenPayload(restored);
  assert.deepEqual(flat.problem_item_ids, ["3", "7", "12"]);
  const parts = appendVisitMultipartFields(flat);
  assert.deepEqual(parts.filter(([key]) => key === "problem_item_ids"), [
    ["problem_item_ids", "3"],
    ["problem_item_ids", "7"],
    ["problem_item_ids", "12"]
  ]);
  assert.ok(!parts.some(([, value]) => String(value).includes("3,7,12")));
});
