#!/usr/bin/env node
/**
 * Step 2 crop + pest/disease selection regressions:
 * - farmer-field crop ids are never used as crop-master ids
 * - only active crop masters become quick chips
 * - problems not in the selected crop's allowed list are dropped (stale selections)
 * - no catalog-wide (cross-crop) problem source in Step 2
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const compiled = ts.transpileModule(read("src/utils/cropSelection.ts"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
}).outputText;
const {
  cropMasterPkFromFieldCrop,
  resolveFarmerCropChips,
  resolveCropChipByName,
  restrictProblemsToAllowed
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const step2 = read("mobile/app/visit/create-step2.tsx");
const optionsApi = read("mobile/lib/visitFormOptionsApi.ts");
const store = read("mobile/store/visitFormStore.ts");
const cropCard = read("mobile/components/visit/step2/CropSelectionCard.tsx");

const ACTIVE_CROPS = [
  { id: 7, name_en: "Paddy", name_ta: "நெல்" },
  { id: 55, name_en: "Banana", name_ta: "வாழை" },
  { id: 9, name_en: "Old Crop", name_ta: "", is_active: false }
];

test("FieldCrop row id is never used as the crop-master id", () => {
  assert.equal(cropMasterPkFromFieldCrop({ id: 55, crop: null, crop_name: "" }), null);
  assert.equal(cropMasterPkFromFieldCrop({ id: 55 }), null);
  assert.equal(cropMasterPkFromFieldCrop({ id: 55, crop: 7 }), 7);
  assert.equal(cropMasterPkFromFieldCrop({ id: 55, crop_id: "7" }), 7);
  assert.equal(cropMasterPkFromFieldCrop({ id: 55, crop: { id: 7 } }), 7);
  assert.equal(cropMasterPkFromFieldCrop({ id: 55, crop: "abc" }), null);
  assert.doesNotMatch(optionsApi, /\?\?\s*crop\.id\b/);
});

test("farmer crop chips resolve only to active crop masters with master labels", () => {
  const fields = [
    {
      land_name: "North plot",
      crops: [
        // FieldCrop 55 has no crop FK — must NOT become Banana (crop master 55).
        { id: 55, crop: null, crop_name: "" },
        { id: 1, crop: 7, crop_name: "Paddy / நெல்" },
        { id: 2, crop: 7, crop_name: "Paddy / நெல்" },
        { id: 3, crop: 9, crop_name: "Old Crop / " },
        { id: 4, crop: 404, crop_name: "Ghost" }
      ]
    },
    { land_name: "Closed plot", is_active: false, crops: [{ id: 5, crop: 55 }] }
  ];
  const chips = resolveFarmerCropChips(fields, ACTIVE_CROPS);
  assert.deepEqual(chips, [
    { crop_id: "7", crop_name: "Paddy", crop_name_ta: "நெல்", field_name: "North plot" }
  ]);
});

test("farmer-level crop name fallback matches active masters only", () => {
  assert.equal(resolveCropChipByName("paddy", ACTIVE_CROPS)?.crop_id, "7");
  assert.equal(resolveCropChipByName("Paddy / நெல்", ACTIVE_CROPS)?.crop_id, "7");
  assert.equal(resolveCropChipByName("வாழை", ACTIVE_CROPS)?.crop_id, "55");
  assert.equal(resolveCropChipByName("Old Crop", ACTIVE_CROPS), null);
  assert.equal(resolveCropChipByName("Unknown", ACTIVE_CROPS), null);
  assert.equal(resolveCropChipByName("", ACTIVE_CROPS), null);
});

test("stale selections after crop change are dropped against the crop's allowed list", () => {
  // Canonical CropProblem rows expose crop=null, so the legacy field cannot decide.
  const selected = [
    { id: 101, crop: null, name: "Stem borer" },
    { id: 202, crop: null, name: "Banana bunchy top" },
    { id: 303, crop: 7, name: "Legacy paddy blast" }
  ];
  const { kept, removed } = restrictProblemsToAllowed(selected, [101, "303"]);
  assert.deepEqual(kept.map((p) => p.id), [101, 303]);
  assert.deepEqual(removed.map((p) => p.id), [202]);
  assert.deepEqual(restrictProblemsToAllowed(selected, []).kept, []);
});

test("store exposes restrictProblemsToCrop and Step 2 applies it after crop items load", () => {
  assert.match(store, /restrictProblemsToCrop: \(allowedProblemIds\) =>/);
  assert.match(store, /restrictProblemsToAllowed\(state\.selectedProblems/);
  assert.match(step2, /restrictProblemsToCrop\(cropProblemItems\.map\(\(item\) => item\.id\)\)/);
});

test("Step 2 never offers cross-crop catalog problems", () => {
  assert.doesNotMatch(step2, /loadCatalogSearchItems|searchAllMode|searchAllProblems/);
  assert.doesNotMatch(optionsApi, /export async function loadCatalogSearchItems/);
  assert.match(step2, /loadCropProblemItems\(requested\)/);
});

test("Step 2 handles load failures with retry and blocks unverified selections", () => {
  assert.match(step2, /\.catch\(\(\) => \{[\s\S]*setCropItemsStatus\("error"\)/);
  assert.match(step2, /latestCropId\.current !== requested/);
  assert.match(step2, /if \(selectedCount > 0\) return problemsVerified;/);
  assert.match(step2, /problemsLoadFailed/);
  assert.match(step2, /retryProblems/);
  assert.match(cropCard, /cropsLoadFailed/);
  assert.match(cropCard, /onRetryCrops/);
  assert.match(cropCard, /minHeight: 44/);
});
