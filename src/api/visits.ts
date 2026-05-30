import { apiClient } from "./client";
import { normalizeMobileVisitSubmitPayload } from "../utils/format";
import { parsePaginatedList, type PaginatedList } from "../utils/apiUnwrap";
import { apiPathFromNextUrl } from "../utils/apiPath";
import { normalizeVisitFromApi } from "../utils/visitFarmer";
import { prepareVisitForSubmit } from "../visit/prepareVisitSubmit";
import { validateVisitSubmitValues } from "../visit/visitValidation";

export { validateVisitSubmitValues } from "../visit/visitValidation";

export type Visit = {
  id: number;
  district?: string | number | null;
  district_name?: string;
  village?: string | number | null;
  village_name?: string;
  farmer_village?: string;
  crop?: string | number | null;
  crop_name?: string;
  crop_info?: {
    id?: number;
    name?: string;
    name_en?: string;
    name_ta?: string;
  };
  land_name?: string;
  land_area?: string | number | null;
  farmer?: {
    id?: number;
    name?: string;
    phone?: string;
    mobile?: string;
    village?: string;
    crop_name?: string;
  };
  farmer_name?: string;
  farmer_phone?: string;
  farmer_mobile?: string;
  next_visit_date?: string | null;
  created_at?: string;
  updated_at?: string | null;
  visit_date?: string | null;
  visit_time?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  crop_health?: string | null;
  pest_issue?: boolean | null;
  disease_issue?: boolean | null;
  weed_condition?: string | null;
  notes?: string | null;
  fertilizer_advice?: string | null;
  pesticide_advice?: string | null;
  irrigation_advice?: string | null;
  general_advice?: string | null;
  follow_up_required?: boolean | null;
};

export type VisitFormValues = {
  district: string;
  village: string;
  crop: string;
  land_name: string;
  land_area: string;
  farmer_id?: string;
  farmer_name: string;
  farmer_phone: string;
  latitude?: string;
  longitude?: string;
  local_sync_id?: string;
  next_visit_date?: string;
  notes?: string;
  crop_health?: string;
  pest_issue?: boolean;
  disease_issue?: boolean;
  weed_condition?: string;
  fertilizer_advice?: string;
  pesticide_advice?: string;
  irrigation_advice?: string;
  general_advice?: string;
  follow_up_required?: boolean;
};

export type VisitListPage = PaginatedList<Visit>;

const MOBILE_VISITS = "mobile/visits/";
const MAX_VISIT_PAGES = 50;

type MobileVisitSubmitData = {
  visit_id: number;
  visit: Visit;
  farmer?: unknown;
  duplicate?: boolean;
};

function normalizeVisitPage(page: PaginatedList<Visit>): VisitListPage {
  return {
    ...page,
    results: page.results.map((row) => normalizeVisitFromApi(row))
  };
}

/** Parse mobile visits list — supports paginated `{ results }` and legacy array. */
export function parseVisitListPayload(data: unknown): VisitListPage {
  return normalizeVisitPage(parsePaginatedList<Visit>(data));
}

export async function fetchVisitsPage(options?: { page?: number; nextUrl?: string | null }): Promise<VisitListPage> {
  let path = MOBILE_VISITS;
  if (options?.nextUrl) {
    path = apiPathFromNextUrl(options.nextUrl);
    if (!path) {
      return { results: [], next: null, count: 0 };
    }
  } else if (options?.page && options.page > 1) {
    path = `${MOBILE_VISITS}?page=${options.page}`;
  }

  const data = await apiClient<unknown>(path);
  return parseVisitListPayload(data);
}

/** All visit pages — for dashboard counts, profile stats, and recent lists. */
export async function getAllVisits(): Promise<Visit[]> {
  const all: Visit[] = [];
  let next: string | null = null;

  for (let guard = 0; guard < MAX_VISIT_PAGES; guard += 1) {
    const batch = await fetchVisitsPage(next ? { nextUrl: next } : {});
    all.push(...batch.results);
    if (!batch.next || batch.results.length === 0) {
      break;
    }
    next = batch.next;
  }

  return all;
}

/** All mobile visits (every page). */
export function getVisits() {
  return getAllVisits();
}

/** Read-only visit detail (timeline screen). */
export function getVisit(id: number) {
  return apiClient<Visit>(`visits/${id}/`).then((row) => normalizeVisitFromApi(row));
}

/** Mobile visit detail with timeline (optional; detail screen uses GET visits/{id}/). */
export function getMobileVisit(id: number) {
  return apiClient<Visit & { timeline?: unknown[] }>(`${MOBILE_VISITS}${id}/`).then((row) =>
    normalizeVisitFromApi(row)
  );
}

export function visitHasSubmittedDetails(visit: Visit): boolean {
  const farmerId = visit.farmer?.id;
  const hasFarmer = Boolean(farmerId || visit.farmer_name?.trim());
  const hasCrop = Boolean(visit.crop != null && visit.crop !== "" || visit.crop_name?.trim());
  const hasGps = visit.latitude != null && visit.longitude != null && visit.latitude !== "" && visit.longitude !== "";
  return hasFarmer && hasCrop && hasGps;
}

/** Visits list: only fully submitted records (farmer + crop + GPS). */
export function isVisitHistoryEntry(visit: Visit): boolean {
  return visitHasSubmittedDetails(visit);
}

/**
 * One-shot field visit submit — POST /api/v1/mobile/visits/ only.
 * No create+complete, no start, no draft/status.
 */
export async function submitMobileVisit(
  values: VisitFormValues,
  options?: { localSyncId?: string }
): Promise<Visit> {
  const prepared = await prepareVisitForSubmit(values);
  const validationError = validateVisitSubmitValues(prepared);
  if (validationError) {
    throw new Error(validationError);
  }

  const payload = normalizeMobileVisitSubmitPayload(prepared as Record<string, unknown>, options);
  if (payload.farmer == null) {
    throw new Error("Farmer is not linked. Select an existing farmer or enter new farmer details.");
  }
  const data = await apiClient<MobileVisitSubmitData>(MOBILE_VISITS, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const visitRow = data.visit ?? (data as unknown as Visit);
  const normalized = normalizeVisitFromApi(visitRow);
  const id = data.visit_id ?? normalized.id;
  return { ...normalized, id };
}

/** @deprecated Use submitMobileVisit */
export const submitFieldVisit = submitMobileVisit;
