/**
 * Single source of truth for auth lifecycle.
 * Navigation and network guards must read this — not competing booleans.
 */
export type AuthPhase =
  | "initializing"
  | "locked"
  | "authenticating_biometric"
  | "validating_session"
  | "authenticated"
  | "unauthenticated"
  | "session_replaced"
  | "fatal_error";

type Listener = (phase: AuthPhase, previous: AuthPhase) => void;

let phase: AuthPhase = "initializing";
const listeners = new Set<Listener>();

export function getAuthPhase(): AuthPhase {
  return phase;
}

export function setAuthPhase(next: AuthPhase, detail?: string): void {
  if (phase === next) return;
  const previous = phase;
  phase = next;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[Auth] state ${previous} → ${next}${detail ? ` — ${detail}` : ""}`);
  }
  for (const listener of listeners) {
    try {
      listener(next, previous);
    } catch {
      // ignore
    }
  }
}

export function subscribeAuthPhase(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Protected APIs / tracking may run only when fully authenticated. */
export function canSendAuthenticatedRequests(): boolean {
  return phase === "authenticated";
}

/** Home tabs must not mount until authenticated. */
export function canEnterAppShell(): boolean {
  return phase === "authenticated";
}

/** Biometric unlock / branded wait — not Login. */
export function isBiometricLockPhase(value: AuthPhase = phase): boolean {
  return value === "locked" || value === "authenticating_biometric";
}

export function isAuthBootstrapping(value: AuthPhase = phase): boolean {
  return value === "initializing" || value === "validating_session";
}
