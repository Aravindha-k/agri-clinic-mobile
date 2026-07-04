/** Internal QA logging — enabled when EXPO_PUBLIC_QA_MODE=true (client QA APK). */
export function isQaMode(): boolean {
  return process.env.EXPO_PUBLIC_QA_MODE === "true";
}

function sanitizeDetail(value: unknown): string {
  const text = String(value ?? "");
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/password[=:]\S+/gi, "password=[redacted]")
    .replace(/token[=:]\S+/gi, "token=[redacted]");
}

export function qaLog(event: string, ...details: unknown[]): void {
  if (!isQaMode()) return;
  const parts = details.map((d) => sanitizeDetail(d)).filter(Boolean);
  console.warn(`[QA] ${event}${parts.length ? ` | ${parts.join(" | ")}` : ""}`);
}

export function qaLogScreenOpen(screen: string, detail?: string): void {
  qaLog("screen_open", screen, detail ?? "");
}

export function qaLogApiFailure(path: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error ?? "unknown");
  qaLog("api_failure", path, msg);
}

export function qaLogNavParamsMissing(screen: string, field: string): void {
  qaLog("nav_params_missing", screen, field);
}

export function qaLogAnimationFallback(component: string, reason: string): void {
  qaLog("animation_fallback", component, reason);
}

export function qaLogCrash(context: string, error: Error | string, stack?: string): void {
  const msg = error instanceof Error ? error.message : error;
  qaLog("crash", context, msg, stack ? sanitizeDetail(stack.slice(0, 400)) : "");
}
