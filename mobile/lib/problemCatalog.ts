import type { ProblemCategory, ProblemItem } from "../../src/api/problems";
import { filterProblemItems, normalizeCategoryCode } from "../../src/utils/problemItemFilter";

export const OTHER_CATEGORY_CODE = "other";

export type CategoryCellDef = {
  code: string;
  tamil: string;
  english: string;
};

/** Master category codes mapped to UI cells (excluding Other). */
export const MASTER_CATEGORY_CELLS: CategoryCellDef[] = [
  { code: "pest", tamil: "பூச்சி", english: "Pest" },
  { code: "disease", tamil: "நோய்", english: "Disease" },
  { code: "nutrient", tamil: "ஊட்டம்", english: "Nutrient" },
  { code: "water", tamil: "நீர்", english: "Water" },
  { code: "weed", tamil: "களை", english: "Weed" }
];

export function isOtherCategory(code?: string | null): boolean {
  return normalizeCategoryCode(code) === OTHER_CATEGORY_CODE;
}

export function categoryCodesMatch(itemCategory: string, cellCode: string): boolean {
  const item = normalizeCategoryCode(itemCategory);
  const cell = normalizeCategoryCode(cellCode);
  if (!item || !cell) return false;
  if (item === cell) return true;
  if (item.includes(cell) || cell.includes(item)) return true;
  if (cell === "nutrient" && item.includes("nutrient")) return true;
  return false;
}

export function isActiveProblemItem(item: ProblemItem): boolean {
  return item.is_active !== false;
}

export function filterActiveProblemItems(items: ProblemItem[]): ProblemItem[] {
  return items.filter(isActiveProblemItem);
}

export function categoryHasItemsForCrop(cellCode: string, items: ProblemItem[]): boolean {
  return filterActiveProblemItems(items).some((item) => categoryCodesMatch(item.category, cellCode));
}

export function countItemsForCategory(cellCode: string, items: ProblemItem[]): number {
  return filterActiveProblemItems(items).filter((item) => categoryCodesMatch(item.category, cellCode)).length;
}

export function getVisibleCategoryCells(items: ProblemItem[]): CategoryCellDef[] {
  return MASTER_CATEGORY_CELLS.filter((cell) => categoryHasItemsForCrop(cell.code, items));
}

export function matchProblemCategory(cell: CategoryCellDef, categories: ProblemCategory[]): ProblemCategory | null {
  return (
    categories.find((c) => normalizeCategoryCode(c.code) === normalizeCategoryCode(cell.code)) ??
    categories.find((c) => c.name?.toLowerCase().includes(cell.english.toLowerCase())) ??
    null
  );
}

export function issueFlagsForCategory(categoryCode?: string | null): {
  pestIssue: boolean;
  diseaseIssue: boolean;
} {
  const code = normalizeCategoryCode(categoryCode);
  return {
    pestIssue: code === "pest" || code.includes("pest"),
    diseaseIssue: code === "disease" || code.includes("disease")
  };
}

export function itemsForSelectedCategory(
  items: ProblemItem[],
  categoryCode: string,
  options: { cropId?: string; searchAll?: boolean; search?: string } = {}
): ProblemItem[] {
  if (isOtherCategory(categoryCode)) return [];
  return filterProblemItems(filterActiveProblemItems(items), {
    categoryCode,
    cropId: options.searchAll ? undefined : options.cropId,
    searchAll: options.searchAll,
    search: options.search
  });
}

export function cropHasMappedProblems(items: ProblemItem[]): boolean {
  return filterActiveProblemItems(items).length > 0;
}

export function findProblemItemById(items: ProblemItem[], id: string): ProblemItem | undefined {
  if (!id.trim()) return undefined;
  return items.find((item) => String(item.id) === id.trim());
}

export function formatCategoryBadge(code?: string | null, name?: string | null): string {
  if (name?.trim()) return name.trim();
  if (!code?.trim()) return "";
  return code
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatCategoryBadgeLocalized(
  code?: string | null,
  name?: string | null,
  language: "en" | "ta" = "en"
): string {
  if (name?.trim()) return name.trim();
  const normalized = normalizeCategoryCode(code);
  const cell = MASTER_CATEGORY_CELLS.find((c) => normalizeCategoryCode(c.code) === normalized);
  if (cell) return language === "ta" ? cell.tamil : cell.english;
  return formatCategoryBadge(code, name);
}

function problemItemFrequency(item: ProblemItem & { frequency?: number; visit_count?: number }) {
  return item.frequency ?? item.visit_count ?? 0;
}

/** Instant local filter for Step 2 search + optional category chip. */
export function filterStep2Problems(
  items: ProblemItem[],
  options: { categoryCode?: string | null; search?: string }
): ProblemItem[] {
  const category = options.categoryCode?.trim();
  const q = (options.search || "").trim().toLowerCase();
  const active = filterActiveProblemItems(items);

  return active.filter((item) => {
    if (category && !categoryCodesMatch(item.category, category)) return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.tamil_name || "").toLowerCase().includes(q) ||
      (item.crop_name || "").toLowerCase().includes(q)
    );
  });
}

export function pickSuggestedProblems(items: ProblemItem[], limit = 3): ProblemItem[] {
  return [...filterActiveProblemItems(items)]
    .sort((a, b) => problemItemFrequency(b) - problemItemFrequency(a))
    .filter((item) => problemItemFrequency(item) > 0)
    .slice(0, limit);
}

export function resolveCategoryMeta(
  categoryCode: string,
  categories: ProblemCategory[]
): { id: string; code: string } {
  const normalized = normalizeCategoryCode(categoryCode);
  const match =
    categories.find((c) => normalizeCategoryCode(c.code) === normalized) ??
    categories.find((c) => c.name?.toLowerCase().includes(normalized)) ??
    null;
  if (match) {
    return { id: String(match.id), code: match.code || categoryCode };
  }
  return { id: categoryCode, code: categoryCode };
}

export function farmerLocationLine(farmer: { village_name?: string; village?: string | number; district_name?: string; district?: string | number } | null): string {
  if (!farmer) return "";
  const village = String(farmer.village_name || farmer.village || "").trim();
  const district = String(farmer.district_name || farmer.district || "").trim();
  if (village && district) return `${village} • ${district}`;
  return village || district;
}
