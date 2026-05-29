/** Resolve directory farmer primary key from visit form values or payload fragments. */
export function resolveFarmerPk(values: Record<string, unknown>): number | null {
  const rawId = values.farmer_id;
  if (typeof rawId === "number" && Number.isFinite(rawId) && rawId > 0) {
    return rawId;
  }
  if (typeof rawId === "string") {
    const trimmed = rawId.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
  }

  const farmer = values.farmer;
  if (typeof farmer === "number" && Number.isFinite(farmer) && farmer > 0) {
    return farmer;
  }
  if (farmer && typeof farmer === "object" && "id" in farmer) {
    const id = (farmer as { id?: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id) && id > 0) {
      return id;
    }
    if (typeof id === "string") {
      const trimmed = id.trim();
      if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
      }
    }
  }

  return null;
}
