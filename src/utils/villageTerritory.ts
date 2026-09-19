import type { TerritoryVillage } from "../api/territory";
import { anyFieldStartsWithSearch } from "./prefixSearch";

export function villageDisplayName(village: Pick<TerritoryVillage, "name" | "name_ta">): string {
  return String(village.name || "").trim();
}

export function villageTamilName(village: Pick<TerritoryVillage, "name_ta">): string {
  return String(village.name_ta || "").trim();
}

/** English primary; Tamil as secondary line when present. */
export function villageSelectTitle(village: TerritoryVillage): string {
  return villageDisplayName(village);
}

export function villageSelectSubtitle(village: TerritoryVillage): string | undefined {
  const ta = villageTamilName(village);
  return ta || undefined;
}

export function villageMatchesPrefixSearch(village: TerritoryVillage, query: string): boolean {
  return anyFieldStartsWithSearch(query, village.name, village.name_ta);
}

export function filterTerritoryVillages(
  villages: TerritoryVillage[],
  query: string
): TerritoryVillage[] {
  const q = String(query ?? "").trim();
  if (!q) return villages;
  return villages.filter((v) => villageMatchesPrefixSearch(v, q));
}

export function isAssignedVillageId(
  villageId: string | number | null | undefined,
  villages: TerritoryVillage[]
): boolean {
  const id = String(villageId ?? "").trim();
  if (!/^\d+$/.test(id)) return false;
  return villages.some((v) => String(v.id) === id);
}

export type LegacyNewFarmerDraft = {
  name?: string;
  phone?: string;
  district_id?: string;
  taluk_id?: string;
  village_id?: string;
};

export type NormalizedNewFarmerDraft = {
  name: string;
  phone: string;
  village_id: string;
  /** True when legacy draft had location that cannot be safely mapped. */
  needsVillageReview: boolean;
};

/**
 * Strip district/taluk from drafts. Keep village_id only when it is in assigned territory.
 * Never invent a village ID.
 */
export function normalizeLegacyNewFarmerDraft(
  draft: LegacyNewFarmerDraft | null | undefined,
  assignedVillages: TerritoryVillage[]
): NormalizedNewFarmerDraft {
  const name = String(draft?.name ?? "").trim();
  const phone = String(draft?.phone ?? "").trim();
  const villageId = String(draft?.village_id ?? "").trim();
  const hadLegacyLocation = Boolean(
    String(draft?.district_id ?? "").trim() ||
      String(draft?.taluk_id ?? "").trim() ||
      villageId
  );

  if (villageId && isAssignedVillageId(villageId, assignedVillages)) {
    return { name, phone, village_id: villageId, needsVillageReview: false };
  }

  return {
    name,
    phone,
    village_id: "",
    needsVillageReview: hadLegacyLocation || Boolean(villageId)
  };
}
