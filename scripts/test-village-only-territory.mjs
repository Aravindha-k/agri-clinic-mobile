/**
 * Village-only territory architecture — mobile operational location.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

function anyFieldStartsWithSearch(query, ...fields) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => {
    const hay = String(field ?? "").trim().toLowerCase();
    return hay.length > 0 && hay.startsWith(q);
  });
}

function villageMatchesPrefixSearch(village, query) {
  return anyFieldStartsWithSearch(query, village.name, village.name_ta);
}

function isAssignedVillageId(villageId, villages) {
  const id = String(villageId ?? "").trim();
  if (!/^\d+$/.test(id)) return false;
  return villages.some((v) => String(v.id) === id);
}

function normalizeLegacyNewFarmerDraft(draft, assignedVillages) {
  const name = String(draft?.name ?? "").trim();
  const phone = String(draft?.phone ?? "").trim();
  const villageId = String(draft?.village_id ?? "").trim();
  const hadLegacyLocation = Boolean(
    String(draft?.district_id ?? "").trim() ||
      String(draft?.taluk_id ?? "").trim() ||
      villageId
  );
  if (villageId && isAssignedVillageId(villageId, assignedVillages)) {
    return { name, phone, village_id: villageId, needsVillageReview: false };
  }
  return {
    name,
    phone,
    village_id: "",
    needsVillageReview: hadLegacyLocation || Boolean(villageId)
  };
}

const assigned = [
  { id: 10, name: "Madagadipattu", name_ta: "மடகடிப்பட்டு" },
  { id: 11, name: "Kedar", name_ta: "" }
];

test("territory API client uses mobile/territory/ and fails closed on empty", () => {
  const api = read("src/api/territory.ts");
  assert.match(api, /mobile\/territory\//);
  assert.match(api, /TerritoryVillage/);
  const ctx = read("src/storage/TerritoryContext.tsx");
  assert.match(ctx, /isEmpty/);
  assert.match(ctx, /fetchEmployeeTerritory/);
  assert.doesNotMatch(ctx, /getDistricts|getTaluks/);
});

test("territory cache is versioned village-only and user-scoped", () => {
  const cache = read("src/storage/territoryCache.ts");
  assert.match(cache, /territory_villages_v1:user_/);
  assert.match(cache, /version !== 1/);
  assert.match(cache, /userId/);
  assert.doesNotMatch(cache, /districts:|taluks:|firka/i);
  assert.match(cache, /villages: TerritoryVillage\[\]/);
  assert.match(cache, /LEGACY_UNSCOPED_TERRITORY_CACHE_KEY/);
});

test("territory context clears on employee switch and never uses unscoped cache", () => {
  const ctx = read("src/storage/TerritoryContext.tsx");
  assert.match(ctx, /employee\?\.id/);
  assert.match(ctx, /readTerritoryCache\(userId\)/);
  assert.match(ctx, /writeTerritoryCache\(userId/);
  assert.match(ctx, /loadedForUserRef/);
  assert.doesNotMatch(ctx, /getDistricts|getTaluks/);
});

test("create-step1 is village-only from assigned territory", () => {
  const step1 = read("mobile/app/visit/create-step1.tsx");
  assert.match(step1, /useTerritory/);
  assert.match(step1, /isAssignedVillage/);
  assert.doesNotMatch(step1, /useLocationCascade/);
  assert.doesNotMatch(step1, /talukSheetRef|districtSheetRef/);
  assert.doesNotMatch(step1, /errDistrict|errTaluk/);
});

test("VillageFilterSheet no longer cascades district/taluk", () => {
  const sheet = read("mobile/components/farmers/VillageFilterSheet.tsx");
  assert.match(sheet, /useTerritory/);
  assert.match(sheet, /filterTerritoryVillages/);
  assert.doesNotMatch(sheet, /useLocationCascade/);
  assert.doesNotMatch(sheet, /setDistrict|setTaluk/);
});

test("farmer create payload is village-only", () => {
  const farmers = read("src/api/farmers.ts");
  assert.match(farmers, /CreateFarmerPayload/);
  assert.match(farmers, /village: number/);
  assert.doesNotMatch(farmers, /district: number/);
  assert.doesNotMatch(farmers, /taluk\?: number/);

  const prepare = read("src/visit/prepareVisitSubmit.ts");
  assert.match(prepare, /createFarmer\(\{\s*name: farmerName,\s*phone: farmerPhone,\s*village: villagePk/s);
  assert.doesNotMatch(prepare, /district: districtPk/);
});

test("visit submit builds village-only operational location — no district/taluk keys", () => {
  const submit = read("mobile/lib/visitSubmitApi.ts");
  assert.doesNotMatch(submit, /district:\s*[\"']/);
  assert.doesNotMatch(submit, /taluk:\s*[\"']/);
  assert.match(submit, /farmerVillagePkToString\(farmer\)/);

  const format = read("src/utils/format.ts");
  assert.match(format, /delete payload\.district/);
  assert.match(format, /delete payload\.taluk/);
  assert.match(format, /delete payload\.firka/);
  assert.doesNotMatch(format, /district: normalizeId\(values\.district\)/);
});

test("English and Tamil village prefix search; blank name_ta ok", () => {
  const v = assigned[0];
  assert.equal(villageMatchesPrefixSearch(v, "Mad"), true);
  assert.equal(villageMatchesPrefixSearch(v, "Madag"), true);
  assert.equal(villageMatchesPrefixSearch(v, "dagad"), false);
  assert.equal(villageMatchesPrefixSearch(v, "மட"), true);
  assert.equal(villageMatchesPrefixSearch(v, "டிப்ப"), false);
  assert.equal(villageMatchesPrefixSearch(assigned[1], "Ked"), true);
  assert.equal(villageMatchesPrefixSearch(assigned[1], ""), true);
});

test("unassigned village protection and legacy draft migration", () => {
  assert.equal(isAssignedVillageId(10, assigned), true);
  assert.equal(isAssignedVillageId(99, assigned), false);

  const ok = normalizeLegacyNewFarmerDraft(
    { name: "A", phone: "9999999999", district_id: "1", taluk_id: "2", village_id: "10" },
    assigned
  );
  assert.equal(ok.village_id, "10");
  assert.equal(ok.needsVillageReview, false);

  const bad = normalizeLegacyNewFarmerDraft(
    { name: "A", phone: "9999999999", district_id: "1", taluk_id: "2", village_id: "99" },
    assigned
  );
  assert.equal(bad.village_id, "");
  assert.equal(bad.needsVillageReview, true);
});

test("zero assignment fail-closed: no all-villages master dump", () => {
  const masters = read("src/api/masters.ts");
  assert.match(masters, /if \(!qs\)/);
  assert.match(masters, /return \[\]/);
  const utils = read("src/utils/villageTerritory.ts");
  assert.match(utils, /Never invent a village ID/);
});

test("revisit still mints fresh local_sync_id", () => {
  const begin = read("mobile/lib/beginNewVisit.ts");
  assert.match(begin, /startRevisitDraft/);
  assert.match(begin, /store\.reset\(\)/);
  assert.match(begin, /applyRevisitPrefill/);
  assert.match(begin, /ensureLocalSyncId\(\)/);
});

test("Asia/Kolkata visit capture timestamps", () => {
  const duty = read("mobile/lib/visitDutyContext.ts");
  assert.match(duty, /indiaCalendarDate/);
  assert.match(duty, /BUSINESS_TIME_ZONE/);
  assert.doesNotMatch(duty, /visit_date: iso\.slice\(0, 10\)/);
});

test("GPS reverse geocode may still mention district as address text", () => {
  const geo = read("src/utils/reverseGeocode.ts");
  assert.match(geo, /row\.district/);
});

test("evidence capture host and watermark path preserved", () => {
  const layout = read("src/utils/evidenceCaptureHostLayout.ts");
  assert.match(layout, /opacity:\s*1/);
  assert.doesNotMatch(layout, /opacity:\s*0/);
  const burner = read("mobile/components/visit/EvidenceStampBurner.tsx");
  assert.match(burner, /EvidencePhotoFooter/);
});

test("master data sync no longer pulls districts for operational use", () => {
  const cache = read("src/storage/masterDataCache.ts");
  assert.doesNotMatch(cache, /getDistricts\(\)/);
  assert.match(cache, /districts: \[\]/);
});

test("firka has no operational mobile usage", () => {
  const step1 = read("mobile/app/visit/create-step1.tsx");
  assert.doesNotMatch(step1, /firka/i);
  const territory = read("src/api/territory.ts");
  assert.doesNotMatch(territory, /firka/i);
});
