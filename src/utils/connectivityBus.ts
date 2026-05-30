type Listener = (online: boolean) => void;

let online = true;
const listeners = new Set<Listener>();

export function getConnectivityOnline() {
  return online;
}

export function setConnectivityOnline(next: boolean) {
  if (online === next) return;
  online = next;
  listeners.forEach((fn) => fn(online));
}

export function subscribeConnectivity(listener: Listener) {
  listeners.add(listener);
  listener(online);
  return () => {
    listeners.delete(listener);
  };
}
