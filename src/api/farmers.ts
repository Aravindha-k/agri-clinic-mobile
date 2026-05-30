import { apiClient } from "./client";
import { asArray } from "../utils/format";
import { parsePaginatedList } from "../utils/apiUnwrap";
import { apiPathFromNextUrl } from "../utils/apiPath";
import { getAllVisits, getVisits, Visit } from "./visits";
import { normalizeVisitFromApi } from "../utils/visitFarmer";

export type Farmer = {
  id: number;
  name?: string;
  phone?: string;
  district?: string | number;
  district_name?: string;
  village?: string | number;
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

/** Fetch one page of farmers — no client-side status/active filtering. */
async function fetchFarmersPage(page: number): Promise<{ results: Farmer[]; hasNext: boolean }> {
  const data = await apiClient<Farmer[] | PaginatedFarmers>(
    `farmers/?page=${page}&page_size=${FARMERS_PAGE_SIZE}`
  );

  if (Array.isArray(data)) {
    return { results: data, hasNext: false };
  }

  const results = asArray<Farmer>(data);
  const hasNext = Boolean(data && typeof data === "object" && data.next);
  return { results, hasNext };
}

/** All farmers from the API (every page). Visit count does not affect inclusion. */
export async function getAllFarmers(): Promise<Farmer[]> {
  const all: Farmer[] = [];
  for (let page = 1; page <= MAX_FARMER_PAGES; page += 1) {
    const { results, hasNext } = await fetchFarmersPage(page);
    all.push(...results);
    if (!hasNext || results.length === 0) {
      break;
    }
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

export function getFarmer(id: number) {
  return apiClient<Farmer>(`farmers/${id}/`);
}

export type CreateFarmerPayload = {
  name: string;
  phone: string;
  district: number;
  village: number;
  address?: string;
  total_land_area?: number;
};

/** Register a new farmer (field employee). Returns the created farmer row. */
export function createFarmer(payload: CreateFarmerPayload) {
  return apiClient<Farmer>("farmers/", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getFarmerFields(id: number) {
  return apiClient(`farmers/${id}/fields/`);
}

export function getFarmerVisits(id: number) {
  return getAllFarmerVisits(id);
}

const MAX_FARMER_VISIT_PAGES = 20;

async function getAllFarmerVisits(id: number): Promise<Visit[]> {
  const base = `farmers/${id}/visits/`;
  const all: Visit[] = [];
  let next: string | null = null;

  for (let page = 0; page < MAX_FARMER_VISIT_PAGES; page += 1) {
    const path: string = next ? apiPathFromNextUrl(next) : base;
    if (!path) {
      break;
    }
    const data: unknown = await apiClient<unknown>(path);
    const batch = parsePaginatedList<Visit>(data);
    all.push(...batch.results.map((row: Visit) => normalizeVisitFromApi(row)));
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
