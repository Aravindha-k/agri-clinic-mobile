import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";

type TeardownHandler = () => void | Promise<void>;

const teardownHandlers = new Set<TeardownHandler>();
let handlingExpired = false;
let scheduled = false;

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

/** Defer logout teardown to the next tick — avoids Android crash during navigation/Alert. */
export function handleSessionExpired(): void {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    void runTeardownHandlers();
  }, 0);
}

export { SESSION_EXPIRED_MESSAGE };
