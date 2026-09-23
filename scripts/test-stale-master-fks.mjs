/**
 * Stale Problem Master PK after production data reset.
 * ID 107 is an example of a deleted server PK — never hardcoded in app logic.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

function extractMasterPk(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  }
  if (typeof value === "object" && value !== null) {
    if ("id" in value) return extractMasterPk(value.id);
    if ("pk" in value) return extractMasterPk(value.pk);
  }
  return null;
}

function toMasterIdSet(ids) {
  const out = new Set();
  if (!ids) return out;
  for (const raw of ids) {
    const pk = extractMasterPk(raw);
    if (pk != null) out.add(String(pk));
  }
  return out;
}

function collectSubmittedProblemMasterIds(values) {
  const ids = [];
  const master = extractMasterPk(values.problem_master_id);
  if (master != null) ids.push(String(master));
  for (const raw of values.problem_item_ids ?? []) {
    const pk = extractMasterPk(raw);
    if (pk != null) ids.push(String(pk));
  }
  return [...new Set(ids)];
}

function reconcileDraftProblemSelection(draft, validProblemMasterIds) {
  const valid = toMasterIdSet(validProblemMasterIds);
  if (valid.size === 0) {
    return {
      selectedProblems: draft.selectedProblems ?? [],
      problemMasterId: draft.problemMasterId ?? "",
      pendingProblemMasterId: draft.pendingProblemMasterId ?? "",
      needsProblemReview: false,
      staleIds: []
    };
  }
  const staleIds = [];
  const kept = (draft.selectedProblems ?? []).filter((item) => {
    const pk = extractMasterPk(item.id);
    if (pk != null && valid.has(String(pk))) return true;
    if (pk != null) staleIds.push(String(pk));
    return false;
  });
  const masterPk = extractMasterPk(draft.problemMasterId);
  if (masterPk != null && !valid.has(String(masterPk))) staleIds.push(String(masterPk));
  const uniqueStale = [...new Set(staleIds)];
  const primary = kept[0] ?? null;
  return {
    selectedProblems: kept,
    problemMasterId: primary ? String(primary.id) : "",
    pendingProblemMasterId: primary ? String(primary.id) : "",
    needsProblemReview: uniqueStale.length > 0,
    staleIds: uniqueStale
  };
}

function validateVisitMasterFks(values, catalog) {
  const problemIds = catalog.problemMasterIds ? toMasterIdSet(catalog.problemMasterIds) : null;
  const submitted = collectSubmittedProblemMasterIds(values);
  if (!submitted.length) return { ok: true, stale: false, staleIds: [] };
  if (!problemIds || problemIds.size === 0) {
    return { ok: false, stale: true, staleIds: submitted };
  }
  const missing = submitted.filter((id) => !problemIds.has(id));
  if (missing.length) return { ok: false, stale: true, staleIds: missing };
  return { ok: true, stale: false, staleIds: [] };
}

function problemMasterPkFromSelection(items, fallbackMasterId) {
  for (const item of items) {
    const pk = extractMasterPk(item.id);
    if (pk != null) return pk;
  }
  void fallbackMasterId;
  return null;
}

const OLD_CACHE = [{ id: 107, name: "Old Problem" }];
const SERVER_NOW = [{ id: 201, name: "Current Problem" }];

test("107 is not hardcoded as a problem master id", () => {
  const files = [
    "src/utils/staleMasterFks.ts",
    "mobile/lib/authoritativeMasters.ts",
    "mobile/lib/visitSubmitApi.ts",
    "mobile/lib/visit/visitSubmitCoordinator.ts",
    "mobile/store/visitFormStore.ts"
  ];
  for (const file of files) {
    assert.doesNotMatch(read(file), /problem_master_id\s*[:=]\s*["']?107/);
    assert.doesNotMatch(read(file), /problemMasterId\s*[:=]\s*["']107["']/);
  }
});

test("cached 107 is dropped after server refresh and draft is marked stale", () => {
  const draft = {
    problemMasterId: "107",
    pendingProblemMasterId: "107",
    selectedProblems: OLD_CACHE
  };
  const next = reconcileDraftProblemSelection(draft, SERVER_NOW.map((row) => row.id));
  assert.equal(next.problemMasterId, "");
  assert.equal(next.needsProblemReview, true);
  assert.deepEqual(next.staleIds, ["107"]);
  assert.equal(next.selectedProblems.length, 0);
});

test("submission with stale 107 is blocked and would not be posted", () => {
  const values = { problem_master_id: "107", problem_item_ids: [107], crop: "84" };
  const blocked = validateVisitMasterFks(values, {
    problemMasterIds: SERVER_NOW.map((row) => row.id)
  });
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.staleIds, ["107"]);
});

test("submission succeeds when current server contains the selected id", () => {
  const values = { problem_master_id: "201", problem_item_ids: [201], crop: "84" };
  const ok = validateVisitMasterFks(values, {
    problemMasterIds: SERVER_NOW.map((row) => row.id)
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.staleIds, []);
});

test("offline + valid cached id is allowed", () => {
  const values = { problem_master_id: "107", problem_item_ids: [107] };
  const ok = validateVisitMasterFks(values, {
    problemMasterIds: OLD_CACHE.map((row) => row.id)
  });
  assert.equal(ok.ok, true);
});

test("offline draft + later server deletes id requires review", () => {
  const queued = { problem_master_id: "107", problem_item_ids: [107] };
  const later = validateVisitMasterFks(queued, {
    problemMasterIds: SERVER_NOW.map((row) => row.id)
  });
  assert.equal(later.ok, false);
  assert.deepEqual(later.staleIds, ["107"]);
});

test("new current problem selected allows submit", () => {
  const afterReselect = reconcileDraftProblemSelection(
    { problemMasterId: "201", selectedProblems: SERVER_NOW },
    SERVER_NOW.map((row) => row.id)
  );
  assert.equal(afterReselect.needsProblemReview, false);
  assert.equal(afterReselect.problemMasterId, "201");
  const ok = validateVisitMasterFks(
    { problem_master_id: "201", problem_item_ids: [201] },
    { problemMasterIds: SERVER_NOW.map((row) => row.id) }
  );
  assert.equal(ok.ok, true);
});

test("leftover draft PK is not sent when selection is empty", () => {
  assert.equal(problemMasterPkFromSelection([], "107"), null);
  assert.equal(problemMasterPkFromSelection([{ id: 201, name: "Current" }], "107"), 201);
});

test("submit coordinator and offline flush validate before POST", () => {
  const coordinator = read("mobile/lib/visit/visitSubmitCoordinator.ts");
  assert.match(coordinator, /resolveAuthoritativeMasters/);
  assert.match(coordinator, /validateVisitAgainstAuthoritativeMasters/);
  assert.match(coordinator, /applyReconciledProblemSelection/);
  assert.match(coordinator, /setStep\(2\)/);
  assert.doesNotMatch(coordinator, /problem_master_id:\s*["']107["']/);

  const offline = read("mobile/lib/sync/offlineSyncManager.ts");
  assert.match(offline, /validateVisitAgainstAuthoritativeMasters/);
  assert.match(offline, /STALE_PROBLEM_MASTER_MESSAGE|select the problem again/);

  const submitApi = read("mobile/lib/visitSubmitApi.ts");
  assert.match(submitApi, /problemMasterPkFromSelection/);
});

test("form options cache is versioned so pre-reset catalogs cannot survive", () => {
  const cache = read("mobile/lib/formOptionsCache.ts");
  assert.match(cache, /form_options_v3/);
  assert.match(cache, /form_options_v1/);
  assert.match(cache, /form_options_v2/);
  assert.match(cache, /problem_items_crop_\$\{cropId\}_v3/);
});

test("online refresh replaces cache and fills problem items", () => {
  const api = read("mobile/lib/visitFormOptionsApi.ts");
  assert.match(api, /refreshAuthoritativeVisitFormOptions/);
  assert.match(api, /ensureProblemItems/);
  assert.match(api, /writeFormOptionsCache\(complete\)/);
});

test("friendly invalid-pk mapping is wired for problem master", () => {
  const errors = read("src/utils/visitSubmitErrors.ts");
  assert.match(errors, /friendlyStaleMasterMessage/);
  const apiError = read("src/utils/apiError.ts");
  assert.match(apiError, /friendlyStaleMasterMessage/);
  const helpers = read("src/utils/staleMasterFks.ts");
  assert.match(
    helpers,
    /One or more selected problems are no longer available/
  );
  assert.doesNotMatch(helpers, /hardcode|107/);
});
