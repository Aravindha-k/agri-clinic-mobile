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

/** Skip duplicate revalidation when screens mount back-to-back in one visit. */
const FRESH_WINDOW_MS = 30_000;

let formOptionsInflight: Promise<VisitFormOptions | null> | null = null;
let formOptionsLastFetch = 0;

/**
 * In-flight dedupe + freshness gate for visit-form-options.
 * force=true always revalidates (forced refresh, cache misses); otherwise a
 * fetch younger than FRESH_WINDOW_MS is treated as fresh and skipped.
 */
function refreshFormOptionsDeduped(force = false): Promise<VisitFormOptions | null> {
  if (formOptionsInflight) return formOptionsInflight;
  if (!force && Date.now() - formOptionsLastFetch < FRESH_WINDOW_MS) {
    return Promise.resolve(null);
  }
  formOptionsInflight = (async () => {
    try {
      return await fetchVisitFormOptionsFromNetwork();
    } finally {
      formOptionsLastFetch = Date.now();
      formOptionsInflight = null;
    }
  })();
  return formOptionsInflight;
}

const cropItemsInflight = new Map<string, Promise<void>>();
const cropItemsFetchedAt = new Map<string, number>();

async function revalidateCropProblemItems(cropId: string): Promise<void> {
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
}

/** Per-crop in-flight dedupe + freshness gate (see refreshFormOptionsDeduped). */
function revalidateCropProblemItemsDeduped(cropId: string, force = false): Promise<void> {
  const existing = cropItemsInflight.get(cropId);
  if (existing) return existing;
  if (!force && Date.now() - (cropItemsFetchedAt.get(cropId) ?? 0) < FRESH_WINDOW_MS) {
    return Promise.resolve();
  }
  const inflight = (async () => {
    try {
      await revalidateCropProblemItems(cropId);
    } finally {
      cropItemsFetchedAt.set(cropId, Date.now());
      cropItemsInflight.delete(cropId);
    }
  })();
  cropItemsInflight.set(cropId, inflight);
  return inflight;
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

  void refreshFormOptionsDeduped();

  if (cached) return cached;
  if (stale) return stale;

  const fresh = await refreshFormOptionsDeduped(true);
  if (fresh) return fresh;
  return { crops: [], problem_categories: [], problem_items: [] };
}

/** Online submit/sync: current server catalogs replace local cache. Always revalidates. */
export async function refreshAuthoritativeVisitFormOptions(): Promise<VisitFormOptions | null> {
  return refreshFormOptionsDeduped(true);
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

  void revalidateCropProblemItemsDeduped(cropId);

  if (cached) return cached as ProblemItem[];
  if (stale) return stale as ProblemItem[];

  await revalidateCropProblemItemsDeduped(cropId, true);
  const refreshed = readCropProblemItemsCache(cropId);
  if (Array.isArray(refreshed)) return refreshed as ProblemItem[];
  return (readStaleCropProblemItems(cropId) ?? []) as ProblemItem[];
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
