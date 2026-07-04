type RecoveryHandler = () => void;

let goHomeHandler: RecoveryHandler | null = null;

export function registerNavigateHome(handler: RecoveryHandler) {
  goHomeHandler = handler;
  return () => {
    if (goHomeHandler === handler) {
      goHomeHandler = null;
    }
  };
}

export function requestNavigateHome() {
  try {
    goHomeHandler?.();
  } catch {
    /* best-effort */
  }
}
