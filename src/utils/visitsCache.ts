import { fetchVisitsPage, Visit } from "../api/visits";

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
