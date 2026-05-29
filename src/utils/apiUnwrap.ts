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

export function resolveList<T = unknown>(payload: unknown): T[] {
  const raw = unwrapSuccessEnvelope(payload) ?? payload;
  if (Array.isArray(raw)) return raw as T[];
  if (raw != null && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.results)) return o.results as T[];
    if (Array.isArray(o.features)) return o.features as T[];
    if (Array.isArray(o.employees)) return o.employees as T[];
    if (Array.isArray(o.locations)) return o.locations as T[];
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.items)) return o.items as T[];
  }
  return [];
}
