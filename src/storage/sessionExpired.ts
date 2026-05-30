import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";

type TeardownHandler = () => void | Promise<void>;

const teardownHandlers = new Set<TeardownHandler>();
let handlingExpired = false;

export function registerSessionExpiredTeardown(handler: TeardownHandler) {
  teardownHandlers.add(handler);
  return () => {
    teardownHandlers.delete(handler);
  };
}

export async function handleSessionExpired(): Promise<void> {
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

export { SESSION_EXPIRED_MESSAGE };
