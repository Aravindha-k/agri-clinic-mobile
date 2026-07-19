/**
 * Gates OS biometric prompts and auth UI until the cinematic splash has finished.
 * System fingerprint dialogs ignore React opacity — never prompt under splash.
 */

let splashUiReady = false;
const listeners = new Set<() => void>();

export function hasSplashUiReady(): boolean {
  return splashUiReady;
}

export function markSplashUiReady(reason = "splash_finished"): void {
  if (splashUiReady) return;
  splashUiReady = true;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore
    }
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[Startup] splash_ui_ready", reason);
  }
}

/** Call when cinematic splash replays (sign-out) so prompts wait again. */
export function resetSplashUiReady(reason = "splash_replay"): void {
  splashUiReady = false;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[Startup] splash_ui_reset", reason);
  }
}

export function onSplashUiReady(listener: () => void): () => void {
  if (splashUiReady) {
    listener();
    return () => undefined;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
