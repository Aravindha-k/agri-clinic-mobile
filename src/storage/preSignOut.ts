type PreSignOutHandler = () => void | Promise<void>;

const handlers = new Set<PreSignOutHandler>();

export function registerPreSignOut(handler: PreSignOutHandler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export async function runPreSignOutHandlers() {
  for (const handler of handlers) {
    try {
      await handler();
    } catch {
      /* best-effort before token clear */
    }
  }
}
