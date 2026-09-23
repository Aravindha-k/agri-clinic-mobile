import { apiClient } from "./client";
import { asArray } from "../utils/format";
import { parsePaginatedList } from "../utils/apiUnwrap";
import { apiPathFromNextUrl } from "../utils/apiPath";
import { extractMasterPk } from "../utils/masterId";
import { getAllVisits, getVisits, Visit } from "./visits";
import { normalizeVisitFromApi } from "../utils/visitFarmer";

export type Farmer = {
  id: number;
  name?: string;
  phone?: string;
  district?: string | number;
  district_name?: string;
  taluk?: string | number | null;
  taluk_name?: string | null;
  village?: string | number | { id?: number | string | null };
  village_id?: string | number | null;
  village_name?: string;
  crop_name?: string;
  list_crop_name?: string;
  land_area?: string | number;
  total_land_area?: string | number;
  is_active?: boolean;
  latitude?: string | number | null;
  longitude?: string | number | null;
  photo_url?: string | null;
  profile_photo_url?: string | null;
  profile_photo?: string | null;
  photo?: string | null;
  visit_count?: number;
  visits?: number;
  total_visits?: number;
  latest_visit_date?: string | null;
  assigned_employee?: number | null;
};

type PaginatedFarmers = {
  results?: Farmer[];
  next?: string | null;
  count?: number;
};

const FARMERS_PAGE_SIZE = 100;
const MAX_FARMER_PAGES = 50;

function farmerKey(phone?: string | null, name?: string | null) {
  return `${(phone || "").trim().toLowerCase()}|${(name || "").trim().toLowerCase()}`;
}

export type FarmerListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Village name filter (backend matches village name). */
  village?: string;
  nextUrl?: string | null;
  signal?: AbortSignal;
  source?: string;
};

export type FarmerListPage = {
  results: Farmer[];
  next: string | null;
  count: number | null;
};

/** Fetch one page of farmers with optional server search / village filter. */
export async function fetchFarmersPage(options: FarmerListQuery = {}): Promise<FarmerListPage> {
  let path = `farmers/?page=${options.page ?? 1}&page_size=${options.pageSize ?? FARMERS_PAGE_SIZE}`;
  if (options.nextUrl) {
    path = apiPathFromNextUrl(options.nextUrl);
    if (!path) {
      return { results: [], next: null, count: 0 };
    }
  } else {
    const params = new URLSearchParams();
    params.set("page", String(options.page ?? 1));
    params.set("page_size", String(options.pageSize ?? FARMERS_PAGE_SIZE));
    if (options.search?.trim()) {
      params.set("search", options.search.trim());
    }
    if (options.village?.trim()) {
      params.set("village", options.village.trim());
    }
    path = `farmers/?${params.toString()}`;
  }

  const data = await apiClient<Farmer[] | PaginatedFarmers>(path, {
    signal: options.signal,
    source: options.source,
    dedupe: !options.signal
  });
  if (Array.isArray(data)) {
    return { results: data, next: null, count: data.length };
  }

  const results = asArray<Farmer>(data);
  const next =
    data && typeof data === "object" && typeof data.next === "string" && data.next.length > 0
      ? data.next
      : null;
  const count = data && typeof data === "object" && typeof data.count === "number" ? data.count : null;
  return { results, next, count };
}

/** All farmers from the API (every page). Visit count does not affect inclusion. */
export async function getAllFarmers(): Promise<Farmer[]> {
  const all: Farmer[] = [];
  let next: string | null = null;
  for (let page = 1; page <= MAX_FARMER_PAGES; page += 1) {
    const batch = await fetchFarmersPage(next ? { nextUrl: next } : { page });
    all.push(...batch.results);
    if (!batch.next || batch.results.length === 0) {
      break;
    }
    next = batch.next;
  }
  return all;
}

function isActiveFarmer(farmer: Farmer): boolean {
  return farmer.is_active !== false;
}

/**
 * Active farmers from the API (every page). Not limited to prior visit history.
 */
export function getFarmersForFieldWorker(): Promise<Farmer[]> {
  return getAllFarmers().then((farmers) => farmers.filter(isActiveFarmer));
}

export function getFarmers() {
  return getAllFarmers();
}

/** Farmer row from create/detail/list — unwrap `{ farmer }` wrappers, never invent an id. */
export function coerceFarmerRecord(raw: unknown): Farmer | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const nested = row.farmer;
  const candidate =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : row;
  const id = extractMasterPk(candidate.id);
  if (id == null) return null;
  return { ...(candidate as Farmer), id };
}

/** Lookup a farmer by phone (preferred) or exact name. Never returns an unrelated first-page hit. */
export async function findFarmerByPhoneOrName(phone?: string, name?: string): Promise<Farmer | null> {
  const search = (phone || name || "").trim();
  if (!search) return null;
  const page = await fetchFarmersPage({ search, pageSize: 20, source: "findFarmerByPhoneOrName" });
  const results = page.results
    .map((row) => coerceFarmerRecord(row) ?? row)
    .filter((row): row is Farmer => row != null && extractMasterPk(row.id) != null);
  const phoneNorm = (phone || "").trim();
  const nameNorm = (name || "").trim().toLowerCase();
  if (phoneNorm) {
    return results.find((f) => (f.phone || "").trim() === phoneNorm) ?? null;
  }
  if (nameNorm) {
    return results.find((f) => (f.name || "").trim().toLowerCase() === nameNorm) ?? null;
  }
  return null;
}

export function getFarmer(id: number) {
  return apiClient<Farmer>(`farmers/${id}/`).then((raw) => coerceFarmerRecord(raw) ?? raw);
}

export type CreateFarmerPayload = {
  name: string;
  phone: string;
  village: number;
  address?: string;
  total_land_area?: number;
};

/** Register a new farmer (field employee). Village-only operational location. */
export function createFarmer(payload: CreateFarmerPayload) {
  return apiClient<Farmer>("farmers/", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((raw) => coerceFarmerRecord(raw) ?? raw);
}

export function getFarmerFields(id: number) {
  return apiClient(`farmers/${id}/fields/`);
}

export type FarmerVisitsPage = {
  results: Visit[];
  next: string | null;
  count: number | null;
};

/** One page of GET /farmers/{id}/visits/ — reuse for profile and full history. */
export async function fetchFarmerVisitsPage(
  id: number,
  options?: { nextUrl?: string | null }
): Promise<FarmerVisitsPage> {
  const path = options?.nextUrl ? apiPathFromNextUrl(options.nextUrl) : `farmers/${id}/visits/`;
  if (!path) {
    return { results: [], next: null, count: 0 };
  }
  const data = await apiClient<unknown>(path);
  const batch = parsePaginatedList<Visit>(data);
  return {
    results: batch.results.map((row) => normalizeVisitFromApi(row)),
    next: batch.next,
    count: batch.count
  };
}

export function getFarmerVisits(id: number, options?: { maxPages?: number }) {
  return getAllFarmerVisits(id, options?.maxPages ?? MAX_FARMER_VISIT_PAGES);
}

/** Profile screens only need recent history — avoid 20-page waterfall on open. */
export const FARMER_PROFILE_VISIT_MAX_PAGES = 2;

const MAX_FARMER_VISIT_PAGES = 20;

async function getAllFarmerVisits(id: number, maxPages = MAX_FARMER_VISIT_PAGES): Promise<Visit[]> {
  const all: Visit[] = [];
  let next: string | null = null;
  const pageLimit = Math.max(1, Math.min(maxPages, MAX_FARMER_VISIT_PAGES));

  for (let page = 0; page < pageLimit; page += 1) {
    const batch = await fetchFarmerVisitsPage(id, { nextUrl: next });
    all.push(...batch.results);
    if (!batch.next || batch.results.length === 0) {
      break;
    }
    next = batch.next;
  }

  return all;
}

export function getFarmerActivity(id: number) {
  return apiClient(`farmers/${id}/activity/`);
}

/** Home quick chips: recently visited farmers, resolved against the full directory. */
export async function getRecentFarmersForHome(limit = 6): Promise<Farmer[]> {
  const [visitsData, farmers] = await Promise.all([getVisits(), getAllFarmers()]);
  const visits = visitsData
    .filter((v) => v.created_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

  const byId = new Map(farmers.map((f) => [f.id, f]));
  const byKey = new Map(farmers.map((f) => [farmerKey(f.phone, f.name), f]));
  const seen = new Set<number>();
  const result: Farmer[] = [];

  for (const visit of visits) {
    const nestedId = visit.farmer?.id;
    let farmer: Farmer | undefined;
    if (nestedId != null && byId.has(nestedId)) {
      farmer = byId.get(nestedId);
    } else {
      farmer = byKey.get(farmerKey(visit.farmer_phone, visit.farmer_name));
    }
    if (farmer && !seen.has(farmer.id)) {
      seen.add(farmer.id);
      result.push(farmer);
    }
    if (result.length >= limit) {
      break;
    }
  }

  return result;
}
