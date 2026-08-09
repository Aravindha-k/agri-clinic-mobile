import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";

type TeardownHandler = () => void | Promise<void>;

const teardownHandlers = new Set<TeardownHandler>();
let handlingExpired = false;
let scheduled = false;
/** While > 0, biometric unlock owns refresh failures — do not force logout. */
let suppressExpiredTeardownDepth = 0;

export function registerSessionExpiredTeardown(handler: TeardownHandler) {
  teardownHandlers.add(handler);
  return () => {
    teardownHandlers.delete(handler);
  };
}

async function runTeardownHandlers() {
  if (handlingExpired) return;
  handlingExpired = true;
  try {
    for (const handler of teardownHandlers) {
      try {
        await handler();
      } catch {
        /* best-effort */
      }
    }
  } finally {
    handlingExpired = false;
  }
}

/**
 * Run work without scheduling session-expired logout teardown.
 * Used while fingerprint unlock is refreshing tokens.
 */
export async function withoutSessionExpiredTeardown<T>(run: () => Promise<T>): Promise<T> {
  suppressExpiredTeardownDepth += 1;
  try {
    return await run();
  } finally {
    suppressExpiredTeardownDepth = Math.max(0, suppressExpiredTeardownDepth - 1);
  }
}

/** Defer logout teardown to the next tick — avoids Android crash during navigation/Alert. */
export function handleSessionExpired(): void {
  if (suppressExpiredTeardownDepth > 0) {
    return;
  }
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    if (suppressExpiredTeardownDepth > 0) return;
    void runTeardownHandlers();
  }, 0);
}

export { SESSION_EXPIRED_MESSAGE };
