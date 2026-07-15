/**
 * Reject (or resolve fallback) if a promise does not settle in time.
 * Use for OEM SecureStore / LocalAuthentication hangs that never throw.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label?: string
): Promise<T> {
  let settled = false;
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (label) {
        // eslint-disable-next-line no-console
        console.warn(`[startup-timeout] ${label} exceeded ${ms}ms — using fallback`);
      }
      resolve(fallback);
    }, ms);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}
