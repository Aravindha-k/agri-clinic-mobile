import { apiClient } from "./client";
import { parsePaginatedList, type PaginatedList } from "../utils/apiUnwrap";
import { apiPathFromNextUrl } from "../utils/apiPath";
import { asArray } from "../utils/format";

export type ProblemCategory = {
  id: number;
  code: string;
  name: string;
  requires_problem_master?: boolean;
};

export type ProblemItem = {
  id: number;
  name: string;
  tamil_name?: string | null;
  category: string;
  crop?: number | null;
  crop_name?: string | null;
  is_active?: boolean;
};

export type ProblemItemListPage = PaginatedList<ProblemItem>;

const PROBLEM_ITEMS_PATH = "masters/problem-items/";
const MAX_PROBLEM_PAGES = 30;

export async function getProblemCategories(): Promise<ProblemCategory[]> {
  const data = await apiClient<ProblemCategory[] | { results: ProblemCategory[] }>(
    "masters/problem-categories/dropdown/"
  );
  return asArray<ProblemCategory>(data);
}

export type ProblemItemsQuery = {
  page?: number;
  nextUrl?: string | null;
  /** Category code from problem-categories/dropdown/ (e.g. pest). */
  category?: string;
  /** Preferred filter when available — matches dropdown row id. */
  categoryId?: string | number;
  cropId?: string | number;
  /** When true, omit crop_id so API returns catalog-wide items. */
  searchAll?: boolean;
  search?: string;
  pageSize?: number;
};

export async function fetchProblemItemsPage(options?: ProblemItemsQuery): Promise<ProblemItemListPage> {
  let path = PROBLEM_ITEMS_PATH;
  if (options?.nextUrl) {
    path = apiPathFromNextUrl(options.nextUrl);
    if (!path) {
      return { results: [], next: null, count: 0 };
    }
  } else {
    const params = new URLSearchParams();
    if (options?.page && options.page > 1) {
      params.set("page", String(options.page));
    }
    if (options?.pageSize) {
      params.set("page_size", String(options.pageSize));
    }
    if (options?.categoryId != null && String(options.categoryId).trim()) {
      params.set("category_id", String(options.categoryId));
    } else if (options?.category?.trim()) {
      params.set("category", options.category.trim());
    }
    if (
      !options?.searchAll &&
      options?.cropId != null &&
      String(options.cropId).trim()
    ) {
      params.set("crop_id", String(options.cropId));
    }
    if (options?.search?.trim()) {
      params.set("search", options.search.trim());
    }
    const qs = params.toString();
    if (qs) {
      path = `${PROBLEM_ITEMS_PATH}?${qs}`;
    }
  }

  const data = await apiClient<unknown>(path);
  return parsePaginatedList<ProblemItem>(data);
}

/** All active problem items (every page) for offline cache. */
export async function getAllProblemItems(): Promise<ProblemItem[]> {
  const all: ProblemItem[] = [];
  let next: string | null = null;

  for (let guard = 0; guard < MAX_PROBLEM_PAGES; guard += 1) {
    const batch = await fetchProblemItemsPage(
      next ? { nextUrl: next } : { pageSize: 200 }
    );
    all.push(...batch.results);
    if (!batch.next || batch.results.length === 0) {
      break;
    }
    next = batch.next;
  }

  return all;
}

/** Human-readable label — prefer API name; otherwise format code. */
export function formatCategoryDisplay(code?: string | null, name?: string | null) {
  if (name?.trim()) return name.trim();
  if (!code?.trim()) return "";
  return code
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** @deprecated Use formatCategoryDisplay with category name from API */
export function problemCategoryLabel(code?: string | null, name?: string | null) {
  return formatCategoryDisplay(code, name);
}

/** Load all pages for a catalog query (used for card grid + offline fallback). */
export async function fetchAllProblemItemsForQuery(
  options: Omit<ProblemItemsQuery, "page" | "nextUrl">
): Promise<{ items: ProblemItem[]; count: number }> {
  const all: ProblemItem[] = [];
  let next: string | null = null;
  let count: number | null = null;

  for (let guard = 0; guard < MAX_PROBLEM_PAGES; guard += 1) {
    const batch = await fetchProblemItemsPage(
      next
        ? { nextUrl: next }
        : { ...options, pageSize: options.pageSize ?? 200 }
    );
    if (count == null && batch.count != null) count = batch.count;
    all.push(...batch.results);
    if (!batch.next || batch.results.length === 0) break;
    next = batch.next;
  }

  return { items: all, count: count ?? all.length };
}
