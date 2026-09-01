import type { ProblemCategory, ProblemItem } from "../../src/api/problems";
import {
  categoryCodeFromValue,
  categoryCodesAreEquivalent,
  filterProblemItems,
  normalizeCategoryCode
} from "../../src/utils/problemItemFilter";
import {
  attachResolvedCategory,
  resolveCategoryMeta
} from "../../src/utils/problemCategoryMeta";

export { attachResolvedCategory, resolveCategoryMeta };

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
  const normalized = normalizeCategoryCode(code);
  return normalized === OTHER_CATEGORY_CODE || normalized === "others";
}

export function categoryCodesMatch(itemCategory: unknown, cellCode: string): boolean {
  return categoryCodesAreEquivalent(itemCategory, cellCode);
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
  code?: unknown,
  name?: string | null,
  language: "en" | "ta" = "en"
): string {
  if (name?.trim()) return name.trim();
  const normalized = categoryCodeFromValue(code);
  const cell = MASTER_CATEGORY_CELLS.find((c) => categoryCodesMatch(normalized, c.code));
  if (cell) return language === "ta" ? cell.tamil : cell.english;
  return formatCategoryBadge(normalized, name);
}

function problemItemFrequency(item: ProblemItem & { frequency?: number; visit_count?: number }) {
  return item.frequency ?? item.visit_count ?? 0;
}

import { problemItemMatchesSearch } from "../../src/utils/problemSearch";

/** Instant local filter for Step 2 search + optional category chip. */
export function filterStep2Problems(
  items: ProblemItem[],
  options: { categoryCode?: string | null; search?: string }
): ProblemItem[] {
  const category = options.categoryCode?.trim();
  const q = (options.search || "").trim();
  const active = filterActiveProblemItems(items);

  return active.filter((item) => {
    if (category && !categoryCodesMatch(item.category, category)) return false;
    if (!q) return true;
    return problemItemMatchesSearch(item, q);
  });
}

export function pickSuggestedProblems(items: ProblemItem[], limit = 3): ProblemItem[] {
  return [...filterActiveProblemItems(items)]
    .sort((a, b) => problemItemFrequency(b) - problemItemFrequency(a))
    .filter((item) => problemItemFrequency(item) > 0)
    .slice(0, limit);
}


export function groupProblemsByCategory(
  items: ProblemItem[],
  language: "en" | "ta" = "en"
): Array<{ code: string; label: string; items: ProblemItem[] }> {
  const assigned = new Set<number>();
  const ordered: Array<{ code: string; label: string; items: ProblemItem[] }> = [];
  const active = filterActiveProblemItems(items);

  for (const cell of MASTER_CATEGORY_CELLS) {
    const group = active.filter((item) => categoryCodesMatch(item.category, cell.code));
    if (!group.length) continue;
    for (const item of group) assigned.add(item.id);
    ordered.push({
      code: cell.code,
      label: language === "ta" ? cell.tamil : cell.english,
      items: group
    });
  }

  const leftoverBuckets = new Map<string, ProblemItem[]>();
  for (const item of active) {
    if (assigned.has(item.id)) continue;
    const code = categoryCodeFromValue(item.category) || "other";
    const list = leftoverBuckets.get(code) ?? [];
    list.push(item);
    leftoverBuckets.set(code, list);
  }
  for (const [code, group] of leftoverBuckets) {
    if (!group.length) continue;
    ordered.push({
      code,
      label: formatCategoryBadgeLocalized(code, undefined, language),
      items: group
    });
  }
  return ordered;
}
