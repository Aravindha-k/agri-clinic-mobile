/**
 * Shared production API URL resolution and validation for CI scripts and audits.
 * Canonical host/normalize live in src/api/apiBaseUrl.js — keep behavior aligned.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  PRODUCTION_API_HOST,
  BLOCKED_RELEASE_HOSTS,
  normalizeApiBaseUrl,
  readExplicitApiEnv
} = require("../../src/api/apiBaseUrl.js");

export { PRODUCTION_API_HOST, normalizeApiBaseUrl };

export const BLOCKED_HOSTS = BLOCKED_RELEASE_HOSTS;

export function resolveApiBaseFromEnv(env = process.env) {
  const raw = readExplicitApiEnv(env);
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
      "EXPO_PUBLIC_API_URL (or EXPO_PUBLIC_API_BASE_URL) is required for production APK builds."
    );
  }

  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error(`Invalid EXPO_PUBLIC_API_URL: could not parse URL.`);
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
