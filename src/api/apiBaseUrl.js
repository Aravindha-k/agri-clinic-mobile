/**
 * Canonical API base URL helpers — CommonJS so `app.config.js` and Metro can share one source.
 * Do not hard-code API hosts elsewhere; import/require from here.
 */

const PRODUCTION_API_HOST = "13.207.17.117";

/** Preferred production REST base (HTTPS). Requires TLS on the host — see deployment notes. */
const PRODUCTION_API_BASE_URL = `https://${PRODUCTION_API_HOST}/api/v1/`;

/** Local Django on the PC LAN (Expo Go / `npm run start:local`). */
const LOCAL_DEV_API_BASE_URL = "http://192.168.29.18:8000/api/v1/";

const BLOCKED_RELEASE_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

function normalizeApiBaseUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return "";
  }

  let url = trimmed.replace(/\/+$/, "");
  url = url.replace(/(\/api\/v1)+$/i, "/api/v1");
  if (!/\/api\/v1$/i.test(url)) {
    url = /\/api$/i.test(url) ? `${url}/v1` : `${url}/api/v1`;
  }
  return `${url}/`;
}

/**
 * Read explicit public API env (never tokens).
 * Prefer EXPO_PUBLIC_API_URL / EXPO_PUBLIC_API_BASE_URL from the active profile or .env.*.
 */
function readExplicitApiEnv(env = process.env) {
  return (
    String(env.EXPO_PUBLIC_API_BASE_URL || "").trim() ||
    String(env.EXPO_PUBLIC_API_URL || "").trim() ||
    ""
  );
}

/**
 * Resolve the API base for app.config.js (build-time embed into expo.extra).
 *
 * Rules:
 * - Explicit EXPO_PUBLIC_API_* always wins.
 * - CI / EAS release profiles fall back to AWS production HTTPS.
 * - Local Metro / Expo Go fall back to the LAN Django URL — never bake AWS into extra by accident.
 */
function resolveAppConfigApiBase(env = process.env) {
  const explicit = readExplicitApiEnv(env);
  if (explicit) {
    return normalizeApiBaseUrl(explicit);
  }

  const profile = String(env.EAS_BUILD_PROFILE || "").trim();
  const isCi = env.GITHUB_ACTIONS === "true" || env.EAS_BUILD === "true";
  const isProductionEnv =
    env.EXPO_PUBLIC_ENV === "production" ||
    env.EXPO_PUBLIC_ENV === "preview" ||
    profile === "preview" ||
    profile === "production" ||
    profile === "production-apk" ||
    profile === "production-aab";

  if (isCi || isProductionEnv) {
    return PRODUCTION_API_BASE_URL;
  }

  return LOCAL_DEV_API_BASE_URL;
}

function isReleaseBuildRuntime(env = process.env, isDev = typeof __DEV__ !== "undefined" ? __DEV__ : false) {
  if (!isDev) {
    return true;
  }
  const profile = String(env.EAS_BUILD_PROFILE || "").trim();
  const buildEnv = String(env.EXPO_PUBLIC_ENV || "").trim();
  return (
    buildEnv === "production" ||
    buildEnv === "preview" ||
    profile === "preview" ||
    profile === "production" ||
    profile === "production-apk" ||
    profile === "production-aab"
  );
}

module.exports = {
  PRODUCTION_API_HOST,
  PRODUCTION_API_BASE_URL,
  LOCAL_DEV_API_BASE_URL,
  BLOCKED_RELEASE_HOSTS,
  normalizeApiBaseUrl,
  readExplicitApiEnv,
  resolveAppConfigApiBase,
  isReleaseBuildRuntime
};
