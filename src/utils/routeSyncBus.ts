/** Fired when route GPS points were uploaded — map screens reload automatically. */
type Listener = () => void;

let routeSyncVersion = 0;
const listeners = new Set<Listener>();

export function getRouteSyncVersion() {
  return routeSyncVersion;
}

export function notifyRouteSynced() {
  routeSyncVersion += 1;
  listeners.forEach((fn) => fn());
}

export function subscribeRouteSync(listener: Listener) {
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}
