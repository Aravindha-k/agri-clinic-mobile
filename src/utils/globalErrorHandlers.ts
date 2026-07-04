import { logStartupError } from "./startupDiagnostics";

let installed = false;

/** Release-safe JS error hooks — logs to logcat via console.warn. */
export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  const errorUtils = (global as typeof globalThis & { ErrorUtils?: { getGlobalHandler: () => (e: Error, f?: boolean) => void; setGlobalHandler: (h: (e: Error, f?: boolean) => void) => void } }).ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const prevHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      const message = error?.message ?? String(error);
      logStartupError(`global:${isFatal ? "fatal" : "error"}:${message}`);
      console.warn("[GlobalErrorHandler]", isFatal ? "FATAL" : "ERROR", message);
      prevHandler?.(error, isFatal);
    });
  }

  const hermes = (global as typeof globalThis & {
    HermesInternal?: { enablePromiseRejectionTracker?: (opts: { allRejections: boolean; onUnhandled: (id: number, rejection: unknown) => void }) => void };
  }).HermesInternal;
  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, rejection) => {
      const message = rejection instanceof Error ? rejection.message : String(rejection ?? "unknown");
      logStartupError(`unhandledRejection:${message}`);
      console.warn("[GlobalErrorHandler] unhandledRejection", message);
    }
  });
}
