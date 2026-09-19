import { apiClient } from "./client";
import { asArray } from "../utils/format";

/** Assigned village from GET mobile/territory/ — operational territory only. */
export type TerritoryVillage = {
  id: number;
  name: string;
  name_ta?: string | null;
  is_active?: boolean;
};

export type TerritoryResponse = {
  villages: TerritoryVillage[];
};

function normalizeVillage(row: unknown): TerritoryVillage | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = Number(r.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = String(r.name ?? r.name_en ?? "").trim();
  if (!name) return null;
  const nameTa = r.name_ta != null ? String(r.name_ta).trim() : "";
  const isActive = r.is_active !== false;
  return {
    id,
    name,
    name_ta: nameTa || null,
    is_active: isActive
  };
}

/** Employee assigned villages only. Empty list = fail closed (no all-master fallback). */
export async function fetchEmployeeTerritory(): Promise<TerritoryVillage[]> {
  const data = await apiClient<TerritoryResponse | TerritoryVillage[]>("mobile/territory/", {
    source: "EmployeeTerritory"
  });

  const rawList = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as TerritoryResponse).villages)
      ? (data as TerritoryResponse).villages
      : [];

  return rawList
    .map(normalizeVillage)
    .filter((v): v is TerritoryVillage => v != null && v.is_active !== false);
}
