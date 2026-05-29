import { DEVICE_SESSION_CONFLICT_CODE } from "../constants/deviceSession";
type TeardownHandler = () => void | Promise<void>;

const teardownHandlers = new Set<TeardownHandler>();
let handlingConflict = false;

export function registerSessionTeardown(handler: TeardownHandler) {
  teardownHandlers.add(handler);
  return () => {
    teardownHandlers.delete(handler);
  };
}

export function isDeviceSessionConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === DEVICE_SESSION_CONFLICT_CODE) return true;
  if (error instanceof Error) {
    return error.message.includes("active on another device");
  }
  return false;
}

/** Stop tracking, clear queues, and sign out when another device takes the session. */
export async function handleDeviceSessionConflict(): Promise<void> {
  if (handlingConflict) return;
  handlingConflict = true;
  try {
    for (const handler of teardownHandlers) {
      try {
        await handler();
      } catch {
        /* best-effort teardown */
      }
    }
  } finally {
    handlingConflict = false;
  }
}
