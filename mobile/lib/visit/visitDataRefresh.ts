/**
 * Central visit-data refresh after submit / sync / delete / media retry.
 * Keeps list, dashboard, and duty-map consumers in sync without multiple emitters.
 */
type VisitDataRefreshListener = () => void;

const listeners = new Set<VisitDataRefreshListener>();

export function subscribeVisitDataRefresh(listener: VisitDataRefreshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitVisitDataRefresh(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  }
}
