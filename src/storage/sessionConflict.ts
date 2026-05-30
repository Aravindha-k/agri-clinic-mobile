import { SESSION_REPLACED_CODES, SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { ApiRequestError } from "../utils/apiError";

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
  if (code && SESSION_REPLACED_CODES.has(code)) return true;
  if (error instanceof ApiRequestError && error.code && SESSION_REPLACED_CODES.has(error.code)) {
    return true;
  }
  if (error instanceof Error) {
    return error.message.includes("used on another device");
  }
  return false;
}

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

export { SESSION_REPLACED_MESSAGE };
