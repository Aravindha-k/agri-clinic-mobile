/** Extract a numeric master/FK id from API values (id, pk, or nested { id }). */
export function extractMasterPk(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
    return null;
  }
  if (typeof value === "object" && value !== null) {
    const row = value as Record<string, unknown>;
    if ("id" in row) {
      return extractMasterPk(row.id);
    }
    if ("pk" in row) {
      return extractMasterPk(row.pk);
    }
  }
  return null;
}

export function masterPkToString(value: unknown): string {
  const pk = extractMasterPk(value);
  return pk != null ? String(pk) : "";
}

type FarmerVillageSource = {
  village?: unknown;
  village_id?: unknown;
} | null | undefined;

/** Numeric Village FK from a Farmer payload — never a name or String(object). */
export function farmerVillagePk(farmer: FarmerVillageSource): number | null {
  if (!farmer) return null;
  const fromVillage = extractMasterPk(farmer.village);
  if (fromVillage != null) return fromVillage;
  const fromVillageId = extractMasterPk(farmer.village_id);
  if (fromVillageId != null) return fromVillageId;
  if (farmer.village && typeof farmer.village === "object") {
    const row = farmer.village as Record<string, unknown>;
    return extractMasterPk(row.village_id) ?? extractMasterPk(row.village);
  }
  return null;
}

export function farmerVillagePkToString(farmer: FarmerVillageSource): string {
  const pk = farmerVillagePk(farmer);
  return pk != null ? String(pk) : "";
}
