/**
 * Mobile prefix search: each field matched independently from the start.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function normalizeSearchQuery(query) {
  return String(query ?? "").trim().toLowerCase();
}

function startsWithSearch(value, query) {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  const hay = normalizeSearchQuery(value);
  if (!hay) return false;
  return hay.startsWith(q);
}

function anyFieldStartsWithSearch(query, ...fields) {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  return fields.some((field) => {
    const hay = normalizeSearchQuery(field);
    return hay.length > 0 && hay.startsWith(q);
  });
}

function farmerMatchesSearch(farmer, query) {
  return anyFieldStartsWithSearch(
    query,
    farmer.name,
    farmer.phone,
    farmer.village_name,
    farmer.village,
    farmer.district_name,
    farmer.district,
    farmer.taluk_name,
    farmer.taluk,
    farmer.crop_name,
    farmer.list_crop_name
  );
}

const sampleFarmer = {
  name: "Aravindh",
  phone: "9626262922",
  village_name: "Kedar",
  district_name: "Villupuram",
  employeeCode: "KAC-0003"
};

test("prefix matches: Ara, ARAV, KAC, Ked, Vill, 962", () => {
  assert.equal(farmerMatchesSearch(sampleFarmer, "Ara"), true);
  assert.equal(farmerMatchesSearch(sampleFarmer, "ARAV"), true);
  assert.equal(farmerMatchesSearch({ ...sampleFarmer, employeeCode: "KAC-0003" }, "KAC"), false);
  assert.equal(farmerMatchesSearch(sampleFarmer, "Ked"), true);
  assert.equal(farmerMatchesSearch(sampleFarmer, "Vill"), true);
  assert.equal(farmerMatchesSearch(sampleFarmer, "962"), true);
});

test("substring middle/end does not match: rav, vindh, edar, illup, 2626", () => {
  assert.equal(farmerMatchesSearch(sampleFarmer, "rav"), false);
  assert.equal(farmerMatchesSearch(sampleFarmer, "vindh"), false);
  assert.equal(farmerMatchesSearch(sampleFarmer, "edar"), false);
  assert.equal(farmerMatchesSearch(sampleFarmer, "illup"), false);
  assert.equal(farmerMatchesSearch(sampleFarmer, "2626"), false);
});

test("whitespace and empty query", () => {
  assert.equal(farmerMatchesSearch(sampleFarmer, "  Ara  "), true);
  assert.equal(farmerMatchesSearch(sampleFarmer, ""), true);
  assert.equal(farmerMatchesSearch(sampleFarmer, "   "), true);
});

test("Tamil prefix on independent field", () => {
  assert.equal(startsWithSearch("பூச்சி", "பூ"), true);
  assert.equal(startsWithSearch("பூச்சி", "ச்சி"), false);
});

test("concatenated haystack is not used in shared helpers", () => {
  const prefix = read("src/utils/prefixSearch.ts");
  assert.doesNotMatch(prefix, /\.join\(/);
  const farmer = read("src/utils/farmerSearch.ts");
  assert.match(farmer, /anyFieldStartsWithSearch/);
  assert.doesNotMatch(farmer, /farmerSearchText\(farmer\)\.includes/);
});

test("MasterSelectSheet and SearchableSelectModal use per-field prefix", () => {
  const sheet = read("mobile/components/visit/MasterSelectSheet.tsx");
  assert.match(sheet, /anyFieldStartsWithSearch/);
  assert.doesNotMatch(sheet, /\.join\(" "\).*includes/);

  const modal = read("src/components/ui/SearchableSelectModal.tsx");
  assert.match(modal, /selectItemMatchesPrefixSearch/);
  assert.doesNotMatch(modal, /\.join\(" "\).*includes/);
});

test("problem search uses problemItemMatchesSearch", () => {
  const catalog = read("mobile/lib/problemCatalog.ts");
  assert.match(catalog, /problemItemMatchesSearch/);
  const filter = read("src/utils/problemItemFilter.ts");
  assert.match(filter, /problemItemMatchesSearch/);
});

test("farmers directory debounce and stale request protection preserved", () => {
  const hook = read("mobile/hooks/useFarmersDirectory.ts");
  assert.match(hook, /SEARCH_DEBOUNCE_MS = 300/);
  assert.match(hook, /requestSeqRef/);
  assert.match(hook, /setPage\(1\)/);
  assert.match(hook, /farmerMatchesSearch/);
});

test("create visit farmer search uses server + offline prefix helper", () => {
  const step1 = read("mobile/app/visit/create-step1.tsx");
  assert.match(step1, /searchRequestId/);
  assert.match(step1, /offlineFarmerMatchesSearch/);
  assert.match(step1, /search: debouncedQuery/);
  assert.match(step1, /if \(!trimmed\) \{\s*setDebouncedQuery\(""\)/s);
});

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}
