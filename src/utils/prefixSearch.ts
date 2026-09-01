/** Trim + lowercase for case-insensitive prefix matching. */
export function normalizeSearchQuery(query: unknown): string {
  return String(query ?? "").trim().toLowerCase();
}

/** True when `value` begins with `query` (case-insensitive). Empty query matches all. */
export function startsWithSearch(value: unknown, query: string): boolean {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  const hay = normalizeSearchQuery(value);
  if (!hay) return false;
  return hay.startsWith(q);
}

/** True when any field independently prefix-matches the query. */
export function anyFieldStartsWithSearch(query: string, ...fields: unknown[]): boolean {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  return fields.some((field) => {
    const hay = normalizeSearchQuery(field);
    return hay.length > 0 && hay.startsWith(q);
  });
}

/** Prefix-match each searchable string on a select row (title, subtitle, etc.). */
export function selectItemMatchesPrefixSearch(
  query: string,
  fields: { title?: string; subtitle?: string; tamilTitle?: string; meta?: string }
): boolean {
  return anyFieldStartsWithSearch(query, fields.title, fields.subtitle, fields.tamilTitle, fields.meta);
}
