import type { MasterOption, TalukOption } from "../api/masters";

export type LocationCascadeSelection = {
  districtId: string;
  talukId: string;
  villageId: string;
};

export const EMPTY_LOCATION_SELECTION: LocationCascadeSelection = {
  districtId: "",
  talukId: "",
  villageId: ""
};

/** District change clears taluk and village. */
export function applyDistrictChange(
  current: LocationCascadeSelection,
  districtId: string
): LocationCascadeSelection {
  if (current.districtId === districtId) return current;
  return { districtId, talukId: "", villageId: "" };
}

/** Taluk change clears village. */
export function applyTalukChange(
  current: LocationCascadeSelection,
  talukId: string
): LocationCascadeSelection {
  if (current.talukId === talukId) return current;
  return { ...current, talukId, villageId: "" };
}

export function applyVillageChange(
  current: LocationCascadeSelection,
  villageId: string
): LocationCascadeSelection {
  return { ...current, villageId };
}

export function isCompleteLocation(selection: LocationCascadeSelection): boolean {
  return Boolean(selection.districtId && selection.talukId && selection.villageId);
}

/** Legacy farmer: district/village may exist with taluk = null. Do not invent a taluk. */
export function isLegacyNullTaluk(farmer: {
  taluk?: string | number | null;
  taluk_name?: string | null;
}): boolean {
  const pk = farmer.taluk;
  if (pk == null || pk === "") return true;
  return false;
}

export function formatTalukLabel(
  farmer: { taluk?: string | number | null; taluk_name?: string | null },
  notAssigned: string
): string {
  if (isLegacyNullTaluk(farmer)) return notAssigned;
  const name = String(farmer.taluk_name || "").trim();
  if (name) return name;
  return String(farmer.taluk);
}

export function villageEnabled(talukId: string): boolean {
  return Boolean(talukId);
}

export function toSelectItems(options: Array<MasterOption | TalukOption>) {
  return options.map((row) => ({
    id: String(row.id),
    title: row.name || row.name_en || `#${row.id}`,
    subtitle: row.name_ta || undefined
  }));
}
