import { fetchVisitsPage, Visit, type VisitDateFilter } from "../api/visits";

const HOME_VISITS_TTL_MS = 60_000;

type HomeVisitsCache = {
  visits: Visit[];
  totalCount: number | null;
  fetchedAt: number;
};

let homeCache: HomeVisitsCache | null = null;

export function invalidateHomeVisitsCache() {
  homeCache = null;
}

export async function getHomeVisits(options?: { force?: boolean; pageSize?: number }) {
  const now = Date.now();
  if (!options?.force && homeCache && now - homeCache.fetchedAt < HOME_VISITS_TTL_MS) {
    return homeCache;
  }
  const page = await fetchVisitsPage({ pageSize: options?.pageSize ?? 50 });
  homeCache = {
    visits: page.results,
    totalCount: page.count,
    fetchedAt: now
  };
  return homeCache;
}

/**
 * Fetches enough uncached pages for map markers without replacing the home-list cache.
 * The cap prevents a malformed pagination chain from keeping the Day screen busy forever.
 */
export async function fetchVisitsForMapMarkers(options?: {
  pageSize?: number;
  maxPages?: number;
  dateFilter?: VisitDateFilter;
}): Promise<Visit[]> {
  const pageSize = options?.pageSize ?? 100;
  const maxPages = options?.maxPages ?? 10;
  const visits: Visit[] = [];
  let nextUrl: string | null | undefined;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const page = await fetchVisitsPage(
      nextUrl
        ? { nextUrl }
        : { pageSize, dateFilter: options?.dateFilter ?? "today", source: "day-map" }
    );
    visits.push(...page.results);
    nextUrl = page.next;
    if (!nextUrl) break;
  }
  return visits;
}
