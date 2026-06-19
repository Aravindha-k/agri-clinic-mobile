/** Server accepted visit but it was already stored (local_sync_id dedup). */
export function isDuplicateVisitResponse(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const row = data as Record<string, unknown>;
  if (row.duplicate === true) return true;
  const nested = row.data;
  if (nested && typeof nested === "object" && (nested as Record<string, unknown>).duplicate === true) {
    return true;
  }
  return false;
}
