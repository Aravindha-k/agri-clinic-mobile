/**
 * Shared production API URL resolution and validation for CI scripts and audits.
 */

export const PRODUCTION_API_HOST = "13.207.17.117";

export const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

export function normalizeApiBaseUrl(raw) {
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

export function resolveApiBaseFromEnv(env = process.env) {
  const raw = env.EXPO_PUBLIC_API_BASE_URL?.trim() || env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) {
    return null;
  }
  return normalizeApiBaseUrl(raw);
}

export function originFromApiBase(base) {
  const parsed = new URL(base);
  return `${parsed.protocol}//${parsed.host}`;
}

/**
 * Validate production API env for release APK builds.
 * Prints only hostname — never full secrets or tokens.
 */
export function validateProductionApiEnv(env = process.env) {
  const base = resolveApiBaseFromEnv(env);
  if (!base) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL (or EXPO_PUBLIC_API_URL) is required for production APK builds."
    );
  }

  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error(`Invalid EXPO_PUBLIC_API_BASE_URL: could not parse URL.`);
  }

  if (BLOCKED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Production APK cannot use ${parsed.hostname}. Use the deployed backend hostname instead.`
    );
  }

  if (parsed.protocol === "https:") {
    return { base, hostname: parsed.hostname, origin: originFromApiBase(base), insecure: false };
  }

  if (parsed.protocol === "http:") {
    const allowInsecure = env.EXPO_PUBLIC_ALLOW_INSECURE_HTTP === "1";
    const qaHost = parsed.hostname === PRODUCTION_API_HOST;
    if (allowInsecure && qaHost) {
      return { base, hostname: parsed.hostname, origin: originFromApiBase(base), insecure: true };
    }
    throw new Error(
      "Production APK requires HTTPS unless EXPO_PUBLIC_ALLOW_INSECURE_HTTP=1 is set for the QA HTTP host."
    );
  }

  throw new Error(`Unsupported API URL protocol: ${parsed.protocol}`);
}

export function printProductionApiHostname(env = process.env) {
  const { hostname, insecure } = validateProductionApiEnv(env);
  console.log(`Production API hostname: ${hostname}${insecure ? " (HTTP QA — cleartext permitted)" : ""}`);
}
