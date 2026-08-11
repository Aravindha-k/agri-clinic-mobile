/**
 * Pure media URL canonicalizer — no Expo / env imports.
 * Media files live on the API origin root, never under /api/v1/.
 */

const LOCAL_URI_RE = /^(file|content|data|blob|ph|assets?):/i;

const KNOWN_API_HOST_RE =
  /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+|.*\.onrender\.com|13\.207\.17\.117)$/i;

function joinOriginPath(origin, pathAndQuery) {
  const base = String(origin || "").replace(/\/+$/, "");
  const [pathOnly, ...queryParts] = String(pathAndQuery || "").split("?");
  const suffix = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  const query = queryParts.length ? `?${queryParts.join("?")}` : "";
  return `${base}${suffix}${query}`;
}

/** Strip /api/v1 and /api when they were accidentally glued onto media paths. */
function sanitizeMediaPath(pathname) {
  let path = String(pathname || "").trim() || "/";

  const nested = path.match(/^\/(https?:\/\/.+)$/i);
  if (nested) {
    try {
      const inner = new URL(nested[1]);
      path = `${inner.pathname}${inner.search}`;
    } catch {
      /* keep original */
    }
  }

  const [pathOnly, ...queryParts] = path.split("?");
  let cleaned = pathOnly || "/";
  cleaned = cleaned.replace(/^\/api\/v1(?=\/|$)/i, "");
  cleaned = cleaned.replace(/^\/api(?=\/(media|uploads|static)(?:\/|$))/i, "");
  if (!cleaned.startsWith("/")) {
    cleaned = `/${cleaned}`;
  }
  cleaned = cleaned.replace(/\/{2,}/g, "/");
  cleaned = cleaned.replace(/^\/media\/media\//i, "/media/");
  const query = queryParts.length ? `?${queryParts.join("?")}` : "";
  return `${cleaned}${query}`;
}

function hostnameOf(origin) {
  try {
    return new URL(origin).hostname;
  } catch {
    return "";
  }
}

/**
 * Resolve a backend media/file value onto the active API origin.
 * Supports relative `/media/…` and absolute `http(s)://host/media/…`.
 */
function canonicalizeMediaUrl(url, mediaOrigin) {
  if (!url || !String(url).trim()) return null;

  const trimmed = String(url).trim();
  if (LOCAL_URI_RE.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return canonicalizeMediaUrl(`http:${trimmed}`, mediaOrigin);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const path = sanitizeMediaPath(`${parsed.pathname}${parsed.search}`);
      const activeHost = hostnameOf(mediaOrigin);
      const known =
        Boolean(activeHost && parsed.hostname === activeHost) || KNOWN_API_HOST_RE.test(parsed.hostname);
      if (known) {
        return joinOriginPath(mediaOrigin, path);
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  let relative = trimmed.replace(/^\/api\/v1\//i, "/");
  if (!relative.startsWith("/")) {
    relative = /^(media|uploads|static)\//i.test(relative) ? `/${relative}` : `/${relative.replace(/^\/+/, "")}`;
  }
  return joinOriginPath(mediaOrigin, sanitizeMediaPath(relative));
}

module.exports = {
  sanitizeMediaPath,
  canonicalizeMediaUrl
};
