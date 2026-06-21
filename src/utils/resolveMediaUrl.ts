import { buildApiUrl, PRODUCTION_API_ENDPOINTS, PRODUCTION_API_HOST, PRODUCTION_API_ORIGIN, PRODUCTION_MEDIA_ORIGIN, API_BASE_URL } from "../api/config";
import { runBackendSmokeTest } from "./productionApiDiagnostics";

const DEV_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+|.*\.onrender\.com)$/i;

function isDevHost(hostname: string): boolean {
  return DEV_HOST_PATTERN.test(hostname);
}

function joinOriginPath(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Resolve backend media/file URLs for images and attachments.
 * - Absolute http(s) on production host → use as-is
 * - Absolute http(s) on localhost/render/LAN → rewrite to AWS origin + path
 * - /media/… /uploads/… → prefix production origin
 * - Never double-prefix or attach /api/v1/ to media paths
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  let trimmed = url.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname === PRODUCTION_API_HOST) {
        return trimmed;
      }
      if (isDevHost(parsed.hostname)) {
        const rewritten = joinOriginPath(PRODUCTION_MEDIA_ORIGIN, parsed.pathname + parsed.search);
        console.warn("[Media] Rewrote dev host URL:", trimmed, "→", rewritten);
        return rewritten;
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("//")) {
    return resolveMediaUrl(`http:${trimmed}`);
  }

  trimmed = trimmed.replace(/^\/api\/v1\//i, "/");

  if (trimmed.startsWith("/media/") || trimmed.startsWith("/uploads/") || trimmed.startsWith("/static/")) {
    return joinOriginPath(PRODUCTION_MEDIA_ORIGIN, trimmed);
  }

  if (trimmed.startsWith("/")) {
    return joinOriginPath(PRODUCTION_MEDIA_ORIGIN, trimmed);
  }

  if (/^(media|uploads|static)\//i.test(trimmed)) {
    return joinOriginPath(PRODUCTION_MEDIA_ORIGIN, `/${trimmed}`);
  }

  return joinOriginPath(PRODUCTION_MEDIA_ORIGIN, `/${trimmed.replace(/^\/+/, "")}`);
}

export function logFailedMediaUrl(url: string | null | undefined, context: string) {
  const resolved = resolveMediaUrl(url);
  console.warn(`[Media] Failed to load (${context}):`, resolved ?? url ?? "(empty)");
}

/** Release-safe startup diagnostics — visible in logcat. */
export function logAppStartupDiagnostics() {
  console.warn("[App] API origin (build env):", PRODUCTION_API_ORIGIN);
  console.warn("[App] API base URL (runtime):", API_BASE_URL);
  console.warn("[App] Login URL:", buildApiUrl("mobile/auth/login/", API_BASE_URL));
  console.warn("[App] Farmers URL:", buildApiUrl("farmers/", API_BASE_URL));
  console.warn("[App] Visits URL:", buildApiUrl("mobile/visits/", API_BASE_URL));
  console.warn("[App] Duty start URL:", buildApiUrl("tracking/duty/start/", API_BASE_URL));
  console.warn("[App] Media origin:", PRODUCTION_MEDIA_ORIGIN);
  console.warn("[App] Expected login URL:", PRODUCTION_API_ENDPOINTS.login);
  void runBackendSmokeTest().catch(() => undefined);
}
