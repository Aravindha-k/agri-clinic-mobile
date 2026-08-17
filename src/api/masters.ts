import { apiClient } from "./client";
import { asArray } from "../utils/format";

export type MasterOption = {
  id: number;
  name?: string;
  name_en?: string;
  name_ta?: string;
  district?: number;
  district_name?: string;
  taluk?: number | null;
  taluk_name?: string | null;
};

export type TalukOption = MasterOption & {
  district: number;
};

export async function getDistricts() {
  const data = await apiClient<MasterOption[] | { results: MasterOption[] }>("masters/districts/");
  return asArray<MasterOption>(data);
}

export async function getTaluks(districtId: string | number): Promise<TalukOption[]> {
  const id = String(districtId).trim();
  if (!id) return [];
  const data = await apiClient<TalukOption[] | { results: TalukOption[] }>(
    `masters/taluks/?district=${encodeURIComponent(id)}`
  );
  return asArray<TalukOption>(data);
}

export type VillagesQuery = {
  taluk?: string | number;
  district?: string | number;
  search?: string;
};

/** Villages for a taluk (preferred) or district. Do not call without a scope for the full catalog. */
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
