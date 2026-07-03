type SplashReplayListener = (reason?: string) => void;

const listeners = new Set<SplashReplayListener>();

/** Subscribe to splash replay requests (e.g. after sign-out). */
export function onSplashReplayRequested(listener: SplashReplayListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Show cinematic splash again — cold-start style entry to login. */
export function requestSplashReplay(reason?: string) {
  for (const listener of listeners) {
    listener(reason);
  }
}
