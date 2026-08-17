import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const store = read("mobile/store/visitFormStore.ts");
const submitApi = read("mobile/lib/visitSubmitApi.ts");
const format = read("src/utils/format.ts");
const catalog = read("mobile/lib/problemCatalog.ts");
const metaSrc = read("src/utils/problemCategoryMeta.ts");
const filter = read("src/utils/problemItemFilter.ts");
const review = read("mobile/app/visit/create-step4-review.tsx");
const queue = read("mobile/lib/pendingVisitsQueue.ts");
const masterId = read("src/utils/masterId.ts");
const prepare = read("src/visit/prepareVisitSubmit.ts");

function extractMasterPk(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  }
  if (typeof value === "object") {
    if ("id" in value) return extractMasterPk(value.id);
    if ("pk" in value) return extractMasterPk(value.pk);
  }
  return null;
}

function normalizeCategoryCode(code) {
  return (code || "").trim().toLowerCase();
}

function categoryCodeFromValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return normalizeCategoryCode(String(value));
  if (typeof value === "object") {
    return normalizeCategoryCode(String(value.code || value.name || ""));
  }
  return "";
}

const CATEGORY_CODE_FAMILIES = [
  ["pest"],
  ["disease"],
  ["nutrient", "nutrient_issue", "nutrient_deficiency"],
  ["water"],
  ["weed"],
  ["other", "others"]
];

function categoryCodesAreEquivalent(a, b) {
  const left = categoryCodeFromValue(a);
  const right = categoryCodeFromValue(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  return CATEGORY_CODE_FAMILIES.some((family) => family.includes(left) && family.includes(right));
}

function isProblemItemLike(value) {
  if (!value || typeof value !== "object") return false;
  return "name" in value && ("category" in value || "category_id" in value || "tamil_name" in value);
}

function resolveCategoryMeta(categoryOrItem, categories) {
  const raw = isProblemItemLike(categoryOrItem)
    ? extractMasterPk(categoryOrItem.category_id) ??
      categoryOrItem.category ??
      categoryOrItem.category_code
    : categoryOrItem;
  const nestedPk = extractMasterPk(raw);
  const code = categoryCodeFromValue(raw);
  if (nestedPk != null) {
    const byId = categories.find((c) => extractMasterPk(c.id) === nestedPk);
    if (byId) return { id: String(byId.id), code: byId.code || code, name: byId.name };
    return { id: String(nestedPk), code };
  }
  if (!code) return { id: "", code: "" };
  const match =
    categories.find((c) => normalizeCategoryCode(c.code) === code) ??
    categories.find((c) => categoryCodesAreEquivalent(c.code, code)) ??
    null;
  if (match && extractMasterPk(match.id) != null) {
    return { id: String(match.id), code: match.code || code, name: match.name };
  }
  return { id: "", code };
}

function attachResolvedCategory(item, categories) {
  const meta = resolveCategoryMeta(item, categories);
  const categoryId = extractMasterPk(meta.id);
  return {
    ...item,
    category_id: categoryId ?? item.category_id ?? null,
    category_code: meta.code || item.category_code,
    category_name: meta.name || item.category_name
  };
}

function problemCategoryPkFromSelection(items, fallbackCategoryId) {
  const fromFallback = extractMasterPk(fallbackCategoryId);
  if (fromFallback != null) return fromFallback;
  for (const item of items) {
    const pk = extractMasterPk(item.category_id) ?? extractMasterPk(item.category);
    if (pk != null) return pk;
  }
  return null;
}

function submitFkPayload(values) {
  const payload = {};
  const farmerPk = extractMasterPk(values.farmer_id);
  const cropPk = extractMasterPk(values.crop);
  const categoryPk = extractMasterPk(values.problem_category_id);
  const masterPk = extractMasterPk(values.problem_master_id);
  if (farmerPk != null) {
    payload.farmer = farmerPk;
    payload.farmer_id = farmerPk;
  }
  if (cropPk != null) {
    payload.crop = cropPk;
    payload.crop_id = cropPk;
  }
  if (categoryPk != null) payload.problem_category_id = categoryPk;
  if (masterPk != null) payload.problem_master_id = masterPk;
  payload.problem_item_ids = Array.isArray(values.problem_item_ids)
    ? values.problem_item_ids.map(Number).filter((id) => Number.isFinite(id))
    : [];
  if (values.problem_description) payload.problem_description = values.problem_description;
  return payload;
}

const nutrientCategories = [
  { id: 16, code: "nutrient_deficiency", name: "Nutrient Deficiency" },
  { id: 2, code: "pest", name: "Pest" },
  { id: 9, code: "others", name: "Others" }
];

const nutrientItem = {
  id: 41,
  name: "Nutrient deficiency",
  tamil_name: "சத்துப்பற்றாக்குறை",
  category: "nutrient_issue",
  crop: 84,
  crop_name: "Amla"
};

test("source never falls back to using a category code as problem_category_id", () => {
  assert.match(metaSrc, /Never returns a name, slug, or API code/);
  assert.doesNotMatch(metaSrc, /return \{ id: categoryCode/);
  assert.doesNotMatch(store, /resolveCategoryMeta\(String\(item\.category\)/);
  assert.match(store, /attachResolvedCategory/);
  assert.match(store, /syncProblemCategoryFromMasters/);
  assert.match(submitApi, /problemCategoryPkFromSelection/);
  assert.match(format, /extractMasterPk\(values\.problem_category_id\)/);
  assert.match(format, /extractMasterPk\(values\.problem_master_id\)/);
  assert.match(prepare, /masterPkToString\(values\.problem_category_id\)/);
  assert.match(filter, /nutrient_issue/);
  assert.match(filter, /nutrient_deficiency/);
  assert.match(catalog, /categoryCodesAreEquivalent/);
  assert.match(review, /tamil_name \|\| item\.name/);
  assert.match(queue, /\.\.\.record\.values/);
  assert.match(masterId, /\/\^\\d\+\$\//);
});

test("nutrient_issue item resolves to the category database PK, not the API code or Tamil name", () => {
  const meta = resolveCategoryMeta(nutrientItem, nutrientCategories);
  assert.equal(meta.id, "16");
  assert.equal(meta.code, "nutrient_deficiency");
  assert.notEqual(meta.id, "nutrient_issue");
  assert.notEqual(meta.id, "nutrient");
  assert.notEqual(meta.id, nutrientItem.tamil_name);

  const attached = attachResolvedCategory(nutrientItem, nutrientCategories);
  assert.equal(attached.category_id, 16);
  assert.equal(attached.tamil_name, "சத்துப்பற்றாக்குறை");
  assert.equal(attached.name, "Nutrient deficiency");
  assert.equal(problemCategoryPkFromSelection([attached], "nutrient_issue"), 16);
  assert.equal(extractMasterPk("nutrient_issue"), null);
  assert.equal(extractMasterPk("சத்துப்பற்றாக்குறை"), null);
  assert.equal(extractMasterPk("Amla"), null);
  assert.ok(Number.isNaN(Number.parseInt("சத்துப்பற்றாக்குறை", 10)));
  assert.equal(extractMasterPk("16"), 16);
});

test("submit payload omits non-PK problem_category_id and keeps numeric FK ids", () => {
  const bad = submitFkPayload({
    farmer_id: "682",
    crop: "84",
    crop_name: "Amla",
    problem_category_id: "nutrient_issue",
    problem_master_id: "சத்துப்பற்றாக்குறை",
    problem_item_ids: [41],
    problem_description: "சத்துப்பற்றாக்குறை"
  });

  assert.equal(bad.problem_category_id, undefined);
  assert.equal(bad.problem_master_id, undefined);
  assert.deepEqual(bad.problem_item_ids, [41]);
  assert.equal(bad.crop, 84);
  assert.equal(bad.crop_id, 84);
  assert.equal(bad.farmer_id, 682);
  assert.equal(bad.farmer, 682);
  assert.equal(bad.problem_description, "சத்துப்பற்றாக்குறை");

  const good = submitFkPayload({
    farmer_id: 682,
    crop: 84,
    problem_category_id: "16",
    problem_master_id: "41",
    problem_item_ids: [41, 7],
    problem_description: "சத்துப்பற்றாக்குறை"
  });

  assert.equal(good.problem_category_id, 16);
  assert.equal(good.problem_master_id, 41);
  assert.deepEqual(good.problem_item_ids, [41, 7]);
});

test("offline queued visit JSON preserves numeric IDs, not labels", () => {
  const queued = {
    farmer: 682,
    crop: 84,
    crop_id: 84,
    problem_category_id: 16,
    problem_master_id: 41,
    problem_item_ids: [41, 7]
  };
  const json = JSON.stringify(queued);
  assert.match(json, /"problem_category_id":16/);
  assert.match(json, /"problem_item_ids":\[41,7\]/);
  assert.doesNotMatch(json, /nutrient_issue/);
  assert.doesNotMatch(json, /சத்துப்பற்றாக்குறை/);
  assert.doesNotMatch(json, /Amla/);
  const restored = JSON.parse(json);
  assert.equal(restored.problem_category_id, 16);
  assert.deepEqual(restored.problem_item_ids, [41, 7]);
});

test("nested category object uses id, never String(object)", () => {
  const meta = resolveCategoryMeta(
    {
      id: 41,
      name: "Nutrient deficiency",
      tamil_name: "சத்துப்பற்றாக்குறை",
      category: { id: 16, code: "nutrient_deficiency", name: "Nutrient Deficiency" }
    },
    nutrientCategories
  );
  assert.equal(meta.id, "16");
  assert.notEqual(meta.id, "[object Object]");
});
