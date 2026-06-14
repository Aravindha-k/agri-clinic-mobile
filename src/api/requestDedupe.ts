import { trackApiCall } from "./apiTelemetry";

const inflight = new Map<string, Promise<unknown>>();

export function dedupeRequest<T>(key: string, source: string | undefined, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) {
    trackApiCall(key, source, true);
    return existing as Promise<T>;
  }

  const promise = factory().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

export function clearInflightRequests() {
  inflight.clear();
}
