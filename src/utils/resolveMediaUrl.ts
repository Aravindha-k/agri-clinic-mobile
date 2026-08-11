import {
  API_BASE_URL,
  PRODUCTION_API_ORIGIN,
  buildApiUrl,
  getApiOrigin,
  getProductionApiEndpoints
} from "../api/config";
import { canonicalizeMediaUrl } from "./canonicalizeMediaUrl.js";

/** Log each rewrite once per session — ProfileAvatar remounts spam otherwise. */
const loggedRewrites = new Set<string>();

/**
 * Media files live on the API server root (not under /api/v1/).
 * Always follow the active API host — local Expo → LAN Django; release → AWS.
 */
export function getMediaOrigin(): string {
  try {
    if (API_BASE_URL) {
      const parsed = new URL(API_BASE_URL);
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    /* fall through */
  }
  const fromConfig = getApiOrigin();
  if (fromConfig && fromConfig !== "unknown") {
    return fromConfig;
  }
  return PRODUCTION_API_ORIGIN;
}

/** @deprecated Prefer getMediaOrigin() — kept for older diagnostics. */
export const PRODUCTION_MEDIA_ORIGIN = PRODUCTION_API_ORIGIN;

function logRewriteOnce(from: string, to: string) {
  if (!__DEV__) return;
  const key = `${from}→${to}`;
  if (loggedRewrites.has(key)) return;
  loggedRewrites.add(key);
  console.warn("[Media] Rewrote media host once:", from, "→", to);
}

/**
 * Resolve backend media/file URLs for images and attachments.
 * - Absolute URL on the active API host → sanitize path, keep active origin
 * - Absolute URL on another known API/LAN host → rewrite onto active media origin
 * - /media/… /uploads/… → prefix active media origin
 * - file:// / content:// optimistic URIs pass through
 * - Never attach /api/v1/ to media paths
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  const mediaOrigin = getMediaOrigin();
  const resolved = canonicalizeMediaUrl(url, mediaOrigin);
  if (
    __DEV__ &&
    resolved &&
    url &&
    resolved !== url.trim() &&
    (url.includes("http") || url.includes("/api/"))
  ) {
    logRewriteOnce(url.trim(), resolved);
  }
  return resolved;
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
  console.warn("[App] Media origin:", getMediaOrigin());
  console.warn("[App] Expected login URL:", getProductionApiEndpoints().login);
}
