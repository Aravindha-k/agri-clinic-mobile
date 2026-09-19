/**
 * Location cascade removed — village-only territory is the operational path.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

test("operational create-step1 and VillageFilterSheet use territory, not district/taluk cascade", () => {
  const step1 = read("mobile/app/visit/create-step1.tsx");
  assert.match(step1, /useTerritory/);
  assert.doesNotMatch(step1, /useLocationCascade/);

  const filter = read("mobile/components/farmers/VillageFilterSheet.tsx");
  assert.match(filter, /useTerritory/);
  assert.doesNotMatch(filter, /useLocationCascade/);
});

test("masters villages still refuse unscoped full catalog dump", () => {
  const masters = read("src/api/masters.ts");
  assert.match(masters, /masters\/villages\/\?/);
  assert.match(masters, /if \(!qs\)/);
  assert.match(masters, /return \[\]/);
  assert.doesNotMatch(masters, /export async function getDistricts/);
  assert.doesNotMatch(masters, /export async function getTaluks/);
});

test("prepareVisitSubmit no longer resolves village via district/taluk scoped master fetch", () => {
  const prepare = read("src/visit/prepareVisitSubmit.ts");
  assert.doesNotMatch(prepare, /getVillages\(/);
  assert.match(prepare, /createFarmer\(\{\s*name: farmerName,\s*phone: farmerPhone,\s*village: villagePk/s);
});

test("dead district/taluk cascade modules are deleted", () => {
  assert.equal(existsSync(resolve(ROOT, "src/hooks/useLocationCascade.ts")), false);
  assert.equal(existsSync(resolve(ROOT, "src/utils/locationCascade.ts")), false);
  assert.equal(existsSync(resolve(ROOT, "src/screens/VisitForm.tsx")), false);
  assert.equal(existsSync(resolve(ROOT, "src/screens/FarmerDetailScreen.tsx")), false);
});
