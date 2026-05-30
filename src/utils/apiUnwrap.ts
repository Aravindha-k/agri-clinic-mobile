/**
 * Unwrap Agri API envelopes: axios { data: { success, message, data } } or plain { success, data }.
 */

function isAxiosResponse(value: unknown): value is { data: unknown } {
  return (
    value != null &&
    typeof value === "object" &&
    "data" in value &&
    (value as { config?: unknown }).config != null
  );
}

export function unwrapSuccessEnvelope<T = unknown>(payload: unknown): T | null {
  if (payload == null) return null;

  const body = isAxiosResponse(payload) ? payload.data : payload;

  if (body != null && typeof body === "object" && "success" in body && "data" in body) {
    return (body as { data: T }).data;
  }

  if (body != null && typeof body === "object" && "data" in body && !Array.isArray(body)) {
    const inner = (body as { data: unknown }).data;
    if (
      inner != null &&
      typeof inner === "object" &&
      !Array.isArray(inner) &&
      "success" in inner &&
      "data" in inner
    ) {
      return (inner as { data: T }).data;
    }
    return inner as T;
  }

  return body as T;
}

export type PaginatedList<T> = {
  results: T[];
  next: string | null;
  previous?: string | null;
  count: number | null;
};

/** Paginated `{ count, next, results }` or legacy plain array. Never throws on null/missing results. */
export function parsePaginatedList<T = unknown>(payload: unknown): PaginatedList<T> {
  const raw = unwrapSuccessEnvelope(payload) ?? payload;
  if (Array.isArray(raw)) {
    return { results: raw as T[], next: null, count: raw.length };
  }
  if (raw != null && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    let results: T[] = [];
    if (Array.isArray(o.results)) {
      results = o.results as T[];
    } else if (Array.isArray(o.data)) {
      results = o.data as T[];
    } else {
      for (const key of ["features", "employees", "locations", "items"] as const) {
        if (Array.isArray(o[key])) {
          results = o[key] as T[];
          break;
        }
      }
    }
    const next = typeof o.next === "string" && o.next.length > 0 ? o.next : null;
    const count = typeof o.count === "number" ? o.count : results.length;
    return { results, next, count };
  }
  return { results: [], next: null, count: 0 };
}

export function resolveList<T = unknown>(payload: unknown): T[] {
  return parsePaginatedList<T>(payload).results;
}
