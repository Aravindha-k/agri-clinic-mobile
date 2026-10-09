import { apiClient } from "../../src/api/client";
import { getCrops, type MasterOption } from "../../src/api/masters";
import {
  fetchAllProblemItemsForQuery,
  getProblemCategories,
  type ProblemCategory,
  type ProblemItem
} from "../../src/api/problems";
import { asArray } from "../../src/utils/format";
import { getFarmerFields } from "../../src/api/farmers";
import {
  readCachedFormOptions,
  readCatalogProblemItemsCache,
  readCropProblemItemsCache,
  readStaleCatalogProblemItems,
  readStaleCropProblemItems,
  readStaleFormOptions,
  writeCatalogProblemItemsCache,
  writeCropProblemItemsCache,
  writeFormOptionsCache
} from "./formOptionsCache";
import { filterActiveProblemItems } from "./problemCatalog";

export type VisitFormOptions = {
  crops: MasterOption[];
  problem_categories: ProblemCategory[];
  problem_items: ProblemItem[];
};

function normalizeFormOptions(data: unknown): VisitFormOptions | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const crops = asArray<MasterOption>(row.crops ?? row.crop_options);
  const problem_categories = asArray<ProblemCategory>(
    row.problem_categories ?? row.categories ?? row.problem_categories_dropdown
  );
  const problem_items = asArray<ProblemItem>(row.problem_items ?? row.problems ?? []);
  if (!crops.length && !problem_categories.length) return null;
  return {
    crops,
    problem_categories,
    problem_items
  };
}

async function buildFallbackFormOptions(): Promise<VisitFormOptions> {
  const [crops, problem_categories, problem_items] = await Promise.all([
    getCrops(),
    getProblemCategories(),
    fetchAllProblemItemsForQuery({ pageSize: 200 }).then((r) => r.items)
  ]);
  return { crops, problem_categories, problem_items };
}

async function ensureProblemItems(options: VisitFormOptions): Promise<VisitFormOptions> {
  if (options.problem_items.length) return options;
  try {
    const { items } = await fetchAllProblemItemsForQuery({ pageSize: 200 });
    return { ...options, problem_items: items };
  } catch {
    return options;
  }
}

async function fetchVisitFormOptionsFromNetwork(): Promise<VisitFormOptions | null> {
  try {
    const data = await apiClient<unknown>("mobile/visit-form-options/", { source: "VisitForm" });
    const normalized = normalizeFormOptions(data);
    if (normalized) {
      const complete = await ensureProblemItems(normalized);
      writeFormOptionsCache(complete);
      return complete;
    }
  } catch {
    // fall through to dropdown fallback
  }
  try {
    const fallback = await buildFallbackFormOptions();
    writeFormOptionsCache(fallback);
    return fallback;
  } catch {
    return null;
  }
}

export async function loadVisitFormOptions(): Promise<VisitFormOptions> {
  const cached = readCachedFormOptions<VisitFormOptions>();
  const stale = readStaleFormOptions<VisitFormOptions>();

  void fetchVisitFormOptionsFromNetwork();

  if (cached) return cached;
  if (stale) return stale;

  const fresh = await fetchVisitFormOptionsFromNetwork();
  if (fresh) return fresh;
  return { crops: [], problem_categories: [], problem_items: [] };
}

/** Online submit/sync: current server catalogs replace local cache. */
export async function refreshAuthoritativeVisitFormOptions(): Promise<VisitFormOptions | null> {
  return fetchVisitFormOptionsFromNetwork();
}

function normalizeProblemItems(data: unknown): ProblemItem[] {
  if (Array.isArray(data)) return data as ProblemItem[];
  if (!data || typeof data !== "object") return [];
  const row = data as Record<string, unknown>;
  return asArray<ProblemItem>(row.results ?? row.items ?? row);
}

export async function loadCropProblemItems(cropId: string): Promise<ProblemItem[]> {
  const cached = readCropProblemItemsCache(cropId);
  const stale = readStaleCropProblemItems(cropId);

  void (async () => {
    try {
      const data = await apiClient<unknown>(`crops/${cropId}/problem-items/`, { source: "VisitForm" });
      const items = normalizeProblemItems(data);
      // Successful response replaces cache even when empty — deleted IDs must not survive.
      writeCropProblemItemsCache(cropId, items);
      return;
    } catch {
      // fall through
    }
    try {
      const { items } = await fetchAllProblemItemsForQuery({ cropId, pageSize: 200 });
      writeCropProblemItemsCache(cropId, items);
    } catch {
      // keep last cache
    }
  })();

  if (cached) return cached as ProblemItem[];
  if (stale) return stale as ProblemItem[];

  try {
    const data = await apiClient<unknown>(`crops/${cropId}/problem-items/`, { source: "VisitForm" });
    const items = normalizeProblemItems(data);
    if (items.length) {
      writeCropProblemItemsCache(cropId, items);
      return items;
    }
  } catch {
    // fall through
  }

  const { items } = await fetchAllProblemItemsForQuery({ cropId, pageSize: 200 });
  writeCropProblemItemsCache(cropId, items);
  return items;
}

/** Catalog-wide active items for a category (no crop filter). Cached by category code. */
export async function loadCatalogProblemItems(categoryCode: string): Promise<ProblemItem[]> {
  const code = categoryCode.trim().toLowerCase();
  const cached = readCatalogProblemItemsCache(code, true);
  const stale = readStaleCatalogProblemItems(code, true);

  void (async () => {
    try {
      const { items } = await fetchAllProblemItemsForQuery({
        category: code,
        searchAll: true,
        pageSize: 200
      });
      writeCatalogProblemItemsCache(code, true, items);
    } catch {
      // ignore background refresh errors
    }
  })();

  if (cached) return filterActiveProblemItems(cached as ProblemItem[]);
  if (stale) return filterActiveProblemItems(stale as ProblemItem[]);

  const { items } = await fetchAllProblemItemsForQuery({
    category: code,
    searchAll: true,
    pageSize: 200
  });
  writeCatalogProblemItemsCache(code, true, items);
  return filterActiveProblemItems(items);
}

/**
 * Raw farmer field rows (with nested `crops`). Resolve chips against active crop
 * masters with `resolveFarmerCropChips`. Empty on failure — chips are optional.
 */
export async function loadFarmerFieldRows(farmerId: number): Promise<unknown[]> {
  try {
    return asArray(await getFarmerFields(farmerId));
  } catch {
    return [];
  }
}

export function itemFrequency(item: ProblemItem & { frequency?: number; visit_count?: number }) {
  return item.frequency ?? item.visit_count ?? 0;
}
