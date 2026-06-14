type Listener = (online: boolean) => void;
type LanOnlyListener = (active: boolean) => void;

let online = true;
let lanOnly = false;
const listeners = new Set<Listener>();
const lanOnlyListeners = new Set<LanOnlyListener>();

export function getConnectivityOnline() {
  return online;
}

export function getLanOnlyMode() {
  return lanOnly;
}

export function setConnectivityOnline(next: boolean) {
  if (online === next) return;
  online = next;
  listeners.forEach((fn) => fn(online));
}

export function setLanOnlyMode(next: boolean) {
  if (lanOnly === next) return;
  lanOnly = next;
  if (next) {
    setConnectivityOnline(false);
  }
  lanOnlyListeners.forEach((fn) => fn(lanOnly));
}

export function subscribeConnectivity(listener: Listener) {
  listeners.add(listener);
  listener(online);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeLanOnly(listener: LanOnlyListener) {
  lanOnlyListeners.add(listener);
  listener(lanOnly);
  return () => {
    lanOnlyListeners.delete(listener);
  };
}
