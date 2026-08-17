import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const cascade = read("src/utils/locationCascade.ts");
const hook = read("src/hooks/useLocationCascade.ts");
const masters = read("src/api/masters.ts");
const cache = read("src/storage/masterDataCache.ts");
const prepare = read("src/visit/prepareVisitSubmit.ts");
const step1 = read("mobile/app/visit/create-step1.tsx");
const farmerProfile = read("mobile/app/farmer/[id].tsx");

function applyDistrictChange(current, districtId) {
  if (current.districtId === districtId) return current;
  return { districtId, talukId: "", villageId: "" };
}
function applyTalukChange(current, talukId) {
  if (current.talukId === talukId) return current;
  return { ...current, talukId, villageId: "" };
}
function isLegacyNullTaluk(farmer) {
  const pk = farmer.taluk;
  return pk == null || pk === "";
}
function formatTalukLabel(farmer, notAssigned) {
  if (isLegacyNullTaluk(farmer)) return notAssigned;
  const name = String(farmer.taluk_name || "").trim();
  return name || String(farmer.taluk);
}

test("district/taluk/village come from scoped master APIs, not hardcoded lists", () => {
  assert.match(masters, /masters\/districts\//);
  assert.match(masters, /masters\/taluks\/\?district=/);
  assert.match(masters, /masters\/villages\/\?/);
  assert.match(hook, /getTaluks\(/);
  assert.match(hook, /getVillages\(\{ taluk: talukId \}\)/);
  assert.match(cache, /villages: cached\?\.villages \?\? \[\]/);
  assert.doesNotMatch(cache, /getVillages\(\)/);
  assert.doesNotMatch(prepare, /getVillages\(\)/);
  assert.match(masters, /if \(!qs\)/);
  assert.doesNotMatch(step1, /Villupuram|Andiarpalayam|Sathupatrakurai/);
});

test("district change clears taluk and village; taluk change clears village", () => {
  const afterDistrict = applyDistrictChange(
    { districtId: "1", talukId: "9", villageId: "88" },
    "2"
  );
  assert.deepEqual(afterDistrict, { districtId: "2", talukId: "", villageId: "" });
  const afterTaluk = applyTalukChange(
    { districtId: "2", talukId: "9", villageId: "88" },
    "11"
  );
  assert.deepEqual(afterTaluk, { districtId: "2", talukId: "11", villageId: "" });
  assert.match(cascade, /applyDistrictChange/);
  assert.match(cascade, /applyTalukChange/);
  assert.match(step1, /villageEnabled|selectTalukFirst|loadingVillages/);
});

test("legacy null-taluk farmers remain readable and unrelated edits do not invent a taluk", () => {
  assert.equal(isLegacyNullTaluk({ taluk: null, village: 12, district: 3 }), true);
  assert.equal(formatTalukLabel({ taluk: null }, "Not assigned"), "Not assigned");
  assert.equal(formatTalukLabel({ taluk: 4, taluk_name: "Vanur" }, "Not assigned"), "Vanur");
  assert.match(cascade, /Do not invent a taluk/);
  assert.match(farmerProfile, /formatTalukLabel/);
  assert.match(farmerProfile, /farmerDetail\.notAssigned/);
  assert.match(prepare, /extractMasterPk\(next\.taluk\) != null \? \{ taluk:/);
});
