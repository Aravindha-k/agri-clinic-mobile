import {
  API_BASE_URL,
  PRODUCTION_API_HOST,
  PRODUCTION_API_ORIGIN,
  buildApiUrl,
  getApiOrigin,
  getProductionApiEndpoints
} from "../api/config";

const DEV_OR_KNOWN_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+|.*\.onrender\.com|13\.207\.17\.117)$/i;

/** Log each rewrite once per session — ProfileAvatar remounts spam otherwise. */
const loggedRewrites = new Set<string>();

function joinOriginPath(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

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
 * - Absolute URL on the active API host → use as-is
 * - Absolute URL on another known API/LAN host → rewrite path onto active media origin
 * - /media/… /uploads/… → prefix active media origin
 * - Never attach /api/v1/ to media paths
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  let trimmed = url.trim();
  const mediaOrigin = getMediaOrigin();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      let activeHost = "";
      try {
        activeHost = new URL(mediaOrigin).hostname;
      } catch {
        activeHost = PRODUCTION_API_HOST;
      }

      if (parsed.hostname === activeHost) {
        return trimmed;
      }

      if (DEV_OR_KNOWN_HOST_PATTERN.test(parsed.hostname)) {
        const rewritten = joinOriginPath(mediaOrigin, parsed.pathname + parsed.search);
        if (rewritten !== trimmed) {
          logRewriteOnce(trimmed, rewritten);
        }
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
    return joinOriginPath(mediaOrigin, trimmed);
  }

  if (trimmed.startsWith("/")) {
    return joinOriginPath(mediaOrigin, trimmed);
  }

  if (/^(media|uploads|static)\//i.test(trimmed)) {
    return joinOriginPath(mediaOrigin, `/${trimmed}`);
  }

  return joinOriginPath(mediaOrigin, `/${trimmed.replace(/^\/+/, "")}`);
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
