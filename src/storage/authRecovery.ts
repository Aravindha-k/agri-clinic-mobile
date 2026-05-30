type RecoveryHandler = () => void | Promise<void>;

let goToLoginHandler: RecoveryHandler | null = null;

export function registerGoToLogin(handler: RecoveryHandler) {
  goToLoginHandler = handler;
  return () => {
    if (goToLoginHandler === handler) {
      goToLoginHandler = null;
    }
  };
}

export async function requestGoToLogin() {
  if (!goToLoginHandler) return;
  try {
    await goToLoginHandler();
  } catch {
    /* best-effort */
  }
}
