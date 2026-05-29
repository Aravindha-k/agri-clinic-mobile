import { apiClient } from "./client";
import { asArray } from "../utils/format";

export type MasterOption = {
  id: number;
  name?: string;
  name_en?: string;
  name_ta?: string;
  district?: number;
  district_name?: string;
};

export async function getDistricts() {
  const data = await apiClient<MasterOption[] | { results: MasterOption[] }>("masters/districts/");
  return asArray<MasterOption>(data);
}

export async function getVillages() {
  const data = await apiClient<MasterOption[] | { results: MasterOption[] }>("masters/villages/");
  return asArray<MasterOption>(data);
}

export async function getCrops() {
  const data = await apiClient<MasterOption[] | { results: MasterOption[] }>("masters/crops/");
  return asArray<MasterOption>(data);
}

export function getOptionLabel(option: MasterOption) {
  return option.name || option.name_en || `#${option.id}`;
}
