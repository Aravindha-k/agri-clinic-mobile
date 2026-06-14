import { fetchAllProblemItemsForQuery, type ProblemItem, type ProblemItemsQuery } from "../api/problems";

const QUERY_TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
  items: ProblemItem[];
  count: number;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(query: Omit<ProblemItemsQuery, "page" | "nextUrl" | "pageSize">) {
  return [
    query.categoryId ?? "",
    query.category ?? "",
    query.searchAll ? "all" : query.cropId ?? "",
    query.search ?? ""
  ].join("|");
}

export function invalidateProblemItemsCache() {
  cache.clear();
}

export async function fetchProblemItemsCached(
  query: Omit<ProblemItemsQuery, "page" | "nextUrl" | "pageSize">
) {
  const key = cacheKey(query);
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.fetchedAt < QUERY_TTL_MS) {
    return { items: hit.items, count: hit.count, fromCache: true as const };
  }
  const result = await fetchAllProblemItemsForQuery(query);
  cache.set(key, { items: result.items, count: result.count, fetchedAt: now });
  return { ...result, fromCache: false as const };
}
