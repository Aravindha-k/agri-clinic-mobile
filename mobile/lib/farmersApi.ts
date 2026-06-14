import { apiClient } from "../../src/api/client";
import { Farmer, fetchFarmersPage, getAllFarmers, type FarmerListPage } from "../../src/api/farmers";
import { apiPathFromNextUrl } from "../../src/utils/apiPath";
import { parsePaginatedList } from "../../src/utils/apiUnwrap";
import { writeFarmersCache } from "./farmersCache";

export type MobileFarmer = Farmer & {
  last_visit_date?: string | null;
  has_follow_up?: boolean;
  follow_up_date?: string | null;
  follow_up_due?: boolean;
  next_follow_up_date?: string | null;
};

export type FarmersPageQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  village?: string;
  nextUrl?: string | null;
};

function buildMobileFarmersPath(options: FarmersPageQuery): string {
  if (options.nextUrl) {
    const path = apiPathFromNextUrl(options.nextUrl);
    if (path) return path;
    return "mobile/farmers/?page=1&page_size=50";
  }
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("page_size", String(options.pageSize ?? 50));
  if (options.search?.trim()) params.set("search", options.search.trim());
  if (options.village?.trim()) params.set("village", options.village.trim());
  return `mobile/farmers/?${params.toString()}`;
}

function normalizePage(data: unknown): FarmerListPage {
  const page = parsePaginatedList<MobileFarmer>(data);
  return {
    results: page.results,
    next: page.next,
    count: page.count ?? page.results.length
  };
}

export async function fetchMobileFarmersPage(options: FarmersPageQuery = {}): Promise<FarmerListPage> {
  const path = buildMobileFarmersPath(options);
  try {
    const data = await apiClient<unknown>(path, { source: "FarmersDirectory" });
    return normalizePage(data);
  } catch {
    return fetchFarmersPage({
      page: options.page,
      pageSize: options.pageSize ?? 50,
      search: options.search,
      village: options.village,
      nextUrl: options.nextUrl,
      source: "FarmersDirectory"
    });
  }
}

export type FarmersSyncProgress = {
  current: number;
  total: number;
  loaded: number;
  farmers: MobileFarmer[];
};

export async function syncAllFarmersToCache(
  onProgress?: (progress: FarmersSyncProgress) => void
): Promise<MobileFarmer[]> {
  const all: MobileFarmer[] = [];
  let next: string | null = null;
  const pageSize = 100;
  let totalPages = 1;

  for (let page = 1; page <= 50; page += 1) {
    const batch = await fetchMobileFarmersPage(
      next ? { nextUrl: next, pageSize } : { page, pageSize }
    );
    if (page === 1 && batch.count != null && batch.count > 0) {
      totalPages = Math.max(1, Math.ceil(batch.count / pageSize));
    }
    all.push(...(batch.results as MobileFarmer[]));
    onProgress?.({ current: page, total: totalPages, loaded: all.length, farmers: [...all] });
    if (!batch.next || batch.results.length === 0) break;
    next = batch.next;
  }

  if (all.length === 0) {
    const fallback = await getAllFarmers();
    writeFarmersCache(fallback);
    return fallback;
  }

  writeFarmersCache(all);
  return all;
}
