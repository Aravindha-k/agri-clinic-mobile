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
