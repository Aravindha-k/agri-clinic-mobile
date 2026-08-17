import type { ProblemCategory, ProblemItem } from "../api/problems";
import { extractMasterPk } from "./masterId";
import {
  categoryCodeFromValue,
  categoryCodesAreEquivalent,
  normalizeCategoryCode
} from "./problemItemFilter";

export type ResolvedProblemCategory = {
  id: string;
  code: string;
  name?: string;
};

function isProblemItemLike(value: unknown): value is ProblemItem {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return "name" in row && ("category" in row || "category_id" in row || "tamil_name" in row);
}

function categoryRawFromValue(value: unknown): unknown {
  if (isProblemItemLike(value)) {
    return extractMasterPk(value.category_id) ?? value.category ?? value.category_code;
  }
  return value;
}

/**
 * Resolve the backend ProblemCategory PK + code for submit.
 * Never returns a name, slug, or API code as `id`.
 */
export function resolveCategoryMeta(
  categoryOrItem: unknown,
  categories: ProblemCategory[]
): ResolvedProblemCategory {
  const raw = categoryRawFromValue(categoryOrItem);
  const nestedPk = extractMasterPk(raw);
  const code = categoryCodeFromValue(raw);

  if (nestedPk != null) {
    const byId = categories.find((c) => extractMasterPk(c.id) === nestedPk);
    if (byId) {
      return { id: String(byId.id), code: byId.code || code, name: byId.name };
    }
    return { id: String(nestedPk), code, name: undefined };
  }

  if (!code) {
    return { id: "", code: "" };
  }

  const match =
    categories.find((c) => normalizeCategoryCode(c.code) === code) ??
    categories.find((c) => categoryCodesAreEquivalent(c.code, code)) ??
    categories.find((c) => normalizeCategoryCode(c.name).includes(code)) ??
    null;

  if (match && extractMasterPk(match.id) != null) {
    return { id: String(match.id), code: match.code || code, name: match.name };
  }

  return { id: "", code };
}

export function attachResolvedCategory(
  item: ProblemItem,
  categories: ProblemCategory[]
): ProblemItem {
  const meta = resolveCategoryMeta(item, categories);
  const categoryId = extractMasterPk(meta.id);
  return {
    ...item,
    category_id: categoryId ?? item.category_id ?? null,
    category_code: meta.code || item.category_code || categoryCodeFromValue(item.category),
    category_name: meta.name || item.category_name
  };
}

export function problemCategoryPkFromSelection(
  items: ProblemItem[],
  fallbackCategoryId?: string | null
): number | null {
  const fromFallback = extractMasterPk(fallbackCategoryId);
  if (fromFallback != null) return fromFallback;
  for (const item of items) {
    const pk = extractMasterPk(item.category_id) ?? extractMasterPk(item.category);
    if (pk != null) return pk;
  }
  return null;
}

export function problemMasterPkFromSelection(
  items: ProblemItem[],
  fallbackMasterId?: string | null
): number | null {
  const fromFallback = extractMasterPk(fallbackMasterId);
  if (fromFallback != null) return fromFallback;
  for (const item of items) {
    const pk = extractMasterPk(item.id);
    if (pk != null) return pk;
  }
  return null;
}
