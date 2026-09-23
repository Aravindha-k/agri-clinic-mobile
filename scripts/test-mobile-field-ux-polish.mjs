/**
 * Field UX polish: selectors, touch, Draft-free leave, visit history, village-only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

test("master and village selectors show selected checkmark and 48dp close", () => {
  const master = read("mobile/components/visit/MasterSelectSheet.tsx");
  const village = read("mobile/components/farmers/VillageFilterSheet.tsx");
  assert.match(master, /selectedId\?:/);
  assert.match(master, /checkmark-circle/);
  assert.match(master, /minTouchStyle/);
  assert.match(master, /a11y\.close/);
  assert.match(master, /a11y\.selected/);
  assert.match(master, /anyFieldStartsWithSearch/);
  assert.doesNotMatch(master, /height:\s*36/);
  assert.match(village, /selectedVillageId\?:/);
  assert.match(village, /checkmark-circle/);
  assert.match(village, /minTouchStyle/);
  assert.match(village, /a11y\.close/);
  assert.match(village, /filterTerritoryVillages/);
  assert.doesNotMatch(village, /height:\s*36/);
});

test("visit steps pass selected village and crop ids into selectors", () => {
  const step1 = read("mobile/app/visit/create-step1.tsx");
  const step2 = read("mobile/app/visit/create-step2.tsx");
  const work = read("mobile/components/work/WorkQueuePanel.tsx");
  assert.match(step1, /selectedId=\{draft\.village_id\}/);
  assert.match(step1, /keyboardType="phone-pad"/);
  assert.match(step2, /selectedId=\{cropId\}/);
  assert.match(work, /selectedVillageId=\{directory\.selectedVillageId\}/);
});

test("visit header and farmer cards use i18n a11y plus icon+text actions", () => {
  const header = read("mobile/components/visit/VisitFlowHeader.tsx");
  const card = read("mobile/components/farmers/FarmerDirectoryCard.tsx");
  assert.match(header, /a11y\.goBack/);
  assert.match(header, /a11y\.close/);
  assert.doesNotMatch(header, /accessibilityLabel="Go back"/);
  assert.match(card, /call-outline" size=\{16\}/);
  assert.match(card, /a11y\.callFarmer/);
  assert.match(card, /a11y\.openMap/);
  assert.match(card, /a11y\.startVisit/);
  assert.match(card, /a11y\.viewVisitHistory/);
});

test("unfinished visit leave is Continue / Cancel only — no user-facing Draft", () => {
  const guard = read("mobile/lib/visitLeaveGuard.ts");
  const shell = read("mobile/app/visit/index.tsx");
  const profile = read("mobile/app/(tabs)/profile.tsx");
  assert.match(guard, /continueVisit/);
  assert.match(guard, /cancelVisit/);
  assert.doesNotMatch(guard, /saveDraft/);
  assert.doesNotMatch(shell, /saveDraft/);
  assert.doesNotMatch(profile, /saveDraft/);
  assert.doesNotMatch(shell, /Draft Visit|Save Draft/);
});

test("Work opens full visit history; village-only territory remains", () => {
  const farmer = read("mobile/app/farmer/[id].tsx");
  const history = read("mobile/app/farmer/visit-history.tsx");
  const types = read("src/navigation/types.ts");
  const territory = read("src/utils/villageTerritory.ts");
  assert.match(farmer, /FarmerVisitHistory/);
  assert.match(history, /fetchFarmerVisitsPage/);
  assert.match(history, /sortVisitsNewestFirst/);
  assert.match(types, /FarmerVisitHistory/);
  assert.match(territory, /filterTerritoryVillages/);
  assert.doesNotMatch(history, /Save Draft|saveDraft/);
});

test("GPS pill uses acquiring copy; no District/Taluk/Firka operational selectors", () => {
  const en = read("src/i18n/en.ts");
  const step1 = read("mobile/app/visit/create-step1.tsx");
  const villageSheet = read("mobile/components/farmers/VillageFilterSheet.tsx");
  assert.match(en, /gpsLoading:\s*"Acquiring/);
  assert.match(step1, /gpsLabel\(/);
  assert.match(villageSheet, /useTerritory/);
  assert.doesNotMatch(villageSheet, /district_id|taluk_id|firka/i);
  assert.doesNotMatch(step1, /Select district|Select taluk|Select firka/i);
});
