import type { ProblemItem } from "../api/problems";

/** Mirrors backend `models_Q_crop_filter`: generic (null crop) or matching crop. */
export function problemItemMatchesCrop(item: ProblemItem, cropId?: string): boolean {
  if (!cropId?.trim()) return true;
  if (item.crop == null || item.crop === undefined) return true;
  return String(item.crop) === cropId.trim();
}

export function normalizeCategoryCode(code?: string | null): string {
  return (code || "").trim().toLowerCase();
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
    if (category && normalizeCategoryCode(item.category) !== category) {
      return false;
    }
    if (!options.searchAll && options.cropId && !problemItemMatchesCrop(item, options.cropId)) {
      return false;
    }
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.tamil_name || "").toLowerCase().includes(q) ||
      (item.crop_name || "").toLowerCase().includes(q)
    );
  });
}
