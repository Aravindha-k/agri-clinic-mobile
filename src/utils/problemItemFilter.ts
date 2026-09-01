import type { ProblemItem } from "../api/problems";
import { problemItemMatchesSearch } from "./problemSearch";

/** Mirrors backend `models_Q_crop_filter`: generic (null crop) or matching crop. */
export function problemItemMatchesCrop(item: ProblemItem, cropId?: string): boolean {
  if (!cropId?.trim()) return true;
  if (item.crop == null || item.crop === undefined) return true;
  return String(item.crop) === cropId.trim();
}

export function normalizeCategoryCode(code?: string | null): string {
  return (code || "").trim().toLowerCase();
}

/** ProblemItem.category may be a code string or a nested { code, name } object. */
export function categoryCodeFromValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return normalizeCategoryCode(String(value));
  }
  if (typeof value === "object") {
    const row = value as { code?: unknown; name?: unknown };
    return normalizeCategoryCode(String(row.code || row.name || ""));
  }
  return "";
}

/**
 * API codes vs DB codes for the same ProblemCategory row.
 * Not IDs — only stable aliases from masters.problem_item_utils.
 */
const CATEGORY_CODE_FAMILIES: string[][] = [
  ["pest"],
  ["disease"],
  ["nutrient", "nutrient_issue", "nutrient_deficiency"],
  ["water"],
  ["weed"],
  ["other", "others"]
];

/** True when two category codes refer to the same backend category family. */
export function categoryCodesAreEquivalent(a: unknown, b: unknown): boolean {
  const left = categoryCodeFromValue(a);
  const right = categoryCodeFromValue(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  return CATEGORY_CODE_FAMILIES.some((family) => family.includes(left) && family.includes(right));
}

export function filterProblemItems(
  items: ProblemItem[],
  options: {
    categoryCode?: string;
    cropId?: string;
    searchAll?: boolean;
    search?: string;
  }
): ProblemItem[] {
  const category = normalizeCategoryCode(options.categoryCode);
  const q = (options.search || "").trim().toLowerCase();

  return items.filter((item) => {
    if (category && !categoryCodesAreEquivalent(item.category, category)) {
      return false;
    }
    if (!options.searchAll && options.cropId && !problemItemMatchesCrop(item, options.cropId)) {
      return false;
    }
    if (!q) return true;
    return problemItemMatchesSearch(item, options.search || "");
  });
}
