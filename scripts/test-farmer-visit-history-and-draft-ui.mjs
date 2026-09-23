/**
 * Farmer visit history from Work + user-facing Draft removal.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

function visitHistoryTimestamp(visit) {
  const raw = visit.visit_date || visit.created_at || visit.updated_at || "";
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function sortVisitsNewestFirst(visits) {
  return [...visits].sort((a, b) => {
    const delta = visitHistoryTimestamp(b) - visitHistoryTimestamp(a);
    if (delta !== 0) return delta;
    return Number(b.id) - Number(a.id);
  });
}

function visitAllowsNotesUpdate(visit) {
  if (!visit) return false;
  if (visit.can_edit === false) return false;
  const id = Number(visit.id);
  return Number.isFinite(id) && id > 0;
}

function farmerVisitHistoryRow(visit) {
  return {
    id: Number(visit.id),
    date: visit.visit_date || "",
    time: visit.visit_time || "",
    crop: visit.crop_name || visit.crop_info?.name || "",
    problems: visit.problem_seen || visit.field_visit?.problem_master?.name || "",
    status: typeof visit.status === "string" && visit.status.trim() ? visit.status : visit.id != null ? "Submitted" : "",
    village: visit.village_name || visit.farmer_village || ""
  };
}

test("farmer with 5 visits — Work history lists all, newest first", () => {
  const visits = [
    { id: 1, visit_date: "2026-01-01", crop_name: "Paddy" },
    { id: 2, visit_date: "2026-03-01", crop_name: "Cotton" },
    { id: 3, visit_date: "2026-02-01", crop_name: "Maize" },
    { id: 4, visit_date: "2026-05-01", crop_name: "Sugarcane" },
    { id: 5, visit_date: "2026-04-01", crop_name: "Groundnut" }
  ];
  const ordered = sortVisitsNewestFirst(visits);
  assert.equal(ordered.length, 5);
  assert.deepEqual(
    ordered.map((row) => row.id),
    [4, 5, 2, 3, 1]
  );
});

test("opening an older visit uses that visit id", () => {
  const ordered = sortVisitsNewestFirst([
    { id: 10, visit_date: "2026-06-01" },
    { id: 11, visit_date: "2026-01-15" }
  ]);
  const older = ordered[1];
  assert.equal(older.id, 11);
  const history = read("mobile/app/farmer/visit-history.tsx");
  assert.match(history, /navigation\.push\("VisitDetail", \{ id: visitId \}\)/);
});

test("edit appears only when current PATCH permission allows it", () => {
  assert.equal(visitAllowsNotesUpdate({ id: 88 }), true);
  assert.equal(visitAllowsNotesUpdate({ id: 88, can_edit: false }), false);
  assert.equal(visitAllowsNotesUpdate({ id: 0 }), false);
  assert.equal(visitAllowsNotesUpdate(null), false);
  const detail = read("mobile/app/visit/[id].tsx");
  assert.match(detail, /visitAllowsNotesUpdate\(visit\)/);
  const history = read("mobile/app/farmer/visit-history.tsx");
  assert.doesNotMatch(history, /setEditMode|Edit\/Update|a11y\.editVisit/);
});

test("farmer with zero visits has a clean empty state", () => {
  const history = read("mobile/app/farmer/visit-history.tsx");
  assert.match(history, /farmerDetail\.noVisits/);
  assert.match(history, /ListEmptyComponent/);
  assert.match(history, /visitHistoryError/);
  assert.match(history, /onRefresh/);
  assert.match(history, /fetchFarmerVisitsPage/);
});

test("history rows expose API fields only — date, time, crop, problems, status, village", () => {
  const row = farmerVisitHistoryRow({
    id: 22,
    visit_date: "2026-09-01",
    visit_time: "10:15:00",
    crop_name: "Paddy",
    problem_seen: "Leaf folder",
    village_name: "Kedar"
  });
  assert.equal(row.crop, "Paddy");
  assert.equal(row.problems, "Leaf folder");
  assert.equal(row.village, "Kedar");
  assert.equal(row.status, "Submitted");
  const src = read("mobile/lib/farmerVisitHistory.ts");
  assert.match(src, /cropLabelFromVisit/);
  assert.match(src, /village_name/);
  assert.doesNotMatch(src, /placeholder crop/i);
});

test("Back/Close unfinished visit — Continue / Cancel only, no Draft", () => {
  const shell = read("mobile/app/visit/index.tsx");
  const guard = read("mobile/lib/visitLeaveGuard.ts");
  const profile = read("mobile/app/(tabs)/profile.tsx");
  assert.match(shell, /presentUnfinishedVisitLeaveDialog/);
  assert.match(shell, /beforeRemove/);
  assert.match(guard, /continueVisit/);
  assert.match(guard, /cancelVisit/);
  assert.match(guard, /cancelVisitConfirmTitle/);
  assert.doesNotMatch(guard, /saveDraft/);
  assert.doesNotMatch(shell, /saveDraft/);
  assert.doesNotMatch(profile, /saveDraft/);
  assert.match(profile, /presentUnfinishedVisitLeaveDialog/);
});

test("Continue preserves unfinished visit; Cancel confirm cleans only that draft", () => {
  const shell = read("mobile/app/visit/index.tsx");
  const begin = read("mobile/lib/beginNewVisit.ts");
  const store = read("mobile/store/visitFormStore.ts");
  assert.match(shell, /onContinue:/);
  assert.match(shell, /guardDialogOpen\.current = false/);
  assert.match(shell, /beginNewVisit\(\{\s*discardMedia:\s*true\s*\}\)/);
  assert.match(begin, /cleanupDraftMedia/);
  assert.match(begin, /store\.reset\(\)/);
  assert.match(store, /persist\(/);
  assert.match(store, /submissionLocalSyncId/);
});

test("offline recovery and revisit local_sync_id remain", () => {
  const store = read("mobile/store/visitFormStore.ts");
  const begin = read("mobile/lib/beginNewVisit.ts");
  const queue = read("mobile/lib/sync/offlineSyncManager.ts");
  assert.match(store, /rehydrateVisitDraftForActiveUser/);
  assert.match(begin, /startRevisitDraft/);
  assert.match(begin, /ensureLocalSyncId\(\)/);
  assert.match(queue, /prepareVisitForSubmit/);
});

test("Work Farmer path opens full history, not last-visit-only", () => {
  const farmer = read("mobile/app/farmer/[id].tsx");
  const queue = read("mobile/components/work/WorkQueuePanel.tsx");
  const types = read("src/navigation/types.ts");
  const nav = read("src/navigation/RootNavigator.tsx");
  const api = read("src/api/farmers.ts");
  assert.match(farmer, /FarmerVisitHistory/);
  assert.match(farmer, /openVisitHistory/);
  assert.doesNotMatch(farmer, /VISITS_EXPAND_CAP/);
  assert.match(queue, /FarmerVisitHistory/);
  assert.match(types, /FarmerVisitHistory/);
  assert.match(nav, /FarmerVisitHistory/);
  assert.match(api, /fetchFarmerVisitsPage/);
  assert.match(api, /farmers\/\$\{id\}\/visits\//);
});
