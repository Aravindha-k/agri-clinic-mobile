import { apiClient } from "./client";
import { asArray } from "../utils/format";

export type MasterOption = {
  id: number;
  name?: string;
  name_en?: string;
  name_ta?: string;
  /** Historical master response fields — not used for operational territory. */
  district?: number;
  district_name?: string;
  taluk?: number | null;
  taluk_name?: string | null;
};

export type VillagesQuery = {
  taluk?: string | number;
  district?: string | number;
  search?: string;
};

/**
 * Scoped village master fetch only. Never call without a query — refuse full catalog dump.
 * Employee operational territory must use GET mobile/territory/, not this endpoint.
 */
export async function getVillages(options?: VillagesQuery) {
  const params = new URLSearchParams();
  if (options?.taluk != null && String(options.taluk).trim()) {
    params.set("taluk", String(options.taluk).trim());
  }
  if (options?.district != null && String(options.district).trim()) {
    params.set("district", String(options.district).trim());
  }
  if (options?.search?.trim()) {
    params.set("search", options.search.trim());
  }
  const qs = params.toString();
  if (!qs) {
    // Never dump the full village catalog (~1373 rows) into the app.
    return [];
  }
  const path = `masters/villages/?${qs}`;
  const data = await apiClient<MasterOption[] | { results: MasterOption[] }>(path);
  return asArray<MasterOption>(data);
}

export async function getCrops() {
  const data = await apiClient<MasterOption[] | { results: MasterOption[] }>("masters/crops/");
  return asArray<MasterOption>(data);
}

export function getOptionLabel(option: MasterOption) {
  return option.name || option.name_en || `#${option.id}`;
}
