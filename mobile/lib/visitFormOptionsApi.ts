import { apiClient } from "../../src/api/client";
import { getCrops, getOptionLabel, type MasterOption } from "../../src/api/masters";
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

export type FarmerFieldCropChip = {
  id: string;
  crop_id: string;
  crop_name: string;
  field_name?: string;
};

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

export async function loadVisitFormOptions(): Promise<VisitFormOptions> {
  const cached = readCachedFormOptions<VisitFormOptions>();
  const stale = readStaleFormOptions<VisitFormOptions>();

  void (async () => {
    try {
      const data = await apiClient<unknown>("mobile/visit-form-options/", { source: "VisitForm" });
      const normalized = normalizeFormOptions(data);
      if (normalized) {
        writeFormOptionsCache(normalized);
        return;
      }
    } catch {
      // fall through
    }
    const fallback = await buildFallbackFormOptions();
    writeFormOptionsCache(fallback);
  })();

  if (cached) return cached;
  if (stale) return stale;

  try {
    const data = await apiClient<unknown>("mobile/visit-form-options/", { source: "VisitForm" });
    const normalized = normalizeFormOptions(data);
    if (normalized) {
      writeFormOptionsCache(normalized);
      return normalized;
    }
  } catch {
    // fall through
  }

  const fallback = await buildFallbackFormOptions();
  writeFormOptionsCache(fallback);
  return fallback;
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
      if (items.length) {
        writeCropProblemItemsCache(cropId, items);
        return;
      }
    } catch {
      // fall through
    }
    const { items } = await fetchAllProblemItemsForQuery({ cropId, pageSize: 200 });
    writeCropProblemItemsCache(cropId, items);
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

/** Catalog-wide search across all categories (crop unmapped fallback). */
export async function loadCatalogSearchItems(search: string): Promise<ProblemItem[]> {
  const needle = search.trim();
  const cacheKey = needle.toLowerCase() || "__all__";
  const cached = readCatalogProblemItemsCache(cacheKey, true);
  const stale = readStaleCatalogProblemItems(cacheKey, true);

  if (cached) return filterActiveProblemItems(cached as ProblemItem[]);
  if (stale) return filterActiveProblemItems(stale as ProblemItem[]);

  const { items } = await fetchAllProblemItemsForQuery({
    searchAll: true,
    search: needle || undefined,
    pageSize: 200
  });
  writeCatalogProblemItemsCache(cacheKey, true, items);
  return filterActiveProblemItems(items);
}

export async function loadFarmerFieldCrops(farmerId: number): Promise<FarmerFieldCropChip[]> {
  try {
    const fields = await getFarmerFields(farmerId);
    const chips: FarmerFieldCropChip[] = [];
    const seen = new Set<string>();

    for (const field of asArray(fields)) {
      if (!field || typeof field !== "object") continue;
      const row = field as Record<string, unknown>;
      const fieldName = String(row.land_name || row.field_name || row.name || "").trim();
      const cropList = asArray(row.crops ?? row.field_crops ?? row.current_crops);
      for (const cropRaw of cropList) {
        if (!cropRaw || typeof cropRaw !== "object") continue;
        const crop = cropRaw as Record<string, unknown>;
        const cropName = String(crop.crop_name || crop.name || "").trim();
        const cropId = crop.crop_id ?? crop.crop ?? crop.id;
        if (!cropName && cropId == null) continue;
        const id = String(cropId ?? cropName);
        if (seen.has(id)) continue;
        seen.add(id);
        chips.push({
          id,
          crop_id: String(cropId ?? ""),
          crop_name: cropName || getOptionLabel({ id: Number(cropId), name: "" }),
          field_name: fieldName || undefined
        });
      }
    }

    return chips;
  } catch {
    return [];
  }
}

export function itemFrequency(item: ProblemItem & { frequency?: number; visit_count?: number }) {
  return item.frequency ?? item.visit_count ?? 0;
}
