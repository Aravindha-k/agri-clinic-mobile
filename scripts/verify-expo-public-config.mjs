/**
 * Ensure `npx expo config --type public` exposes the production API hostname.
 * Run: node scripts/verify-expo-public-config.mjs
 */
import { execSync } from "node:child_process";
import { validateProductionApiEnv } from "./lib/apiConfigEnv.mjs";

const { hostname, base } = validateProductionApiEnv();

let stdout = "";
try {
  const childEnv = {
    ...process.env,
    GOOGLE_MAPS_ANDROID_API_KEY:
      process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() || "ci-config-read-placeholder"
  };
  stdout = execSync("npx expo config --type public --json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: childEnv
  });
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[verify-expo-public-config] expo config failed: ${message}`);
  process.exit(1);
}

let config;
try {
  config = JSON.parse(stdout);
} catch {
  console.error("[verify-expo-public-config] Could not parse expo config JSON output.");
  process.exit(1);
}

const extra = config?.extra ?? {};
const extraBase = String(extra.apiBaseUrl ?? extra.apiUrl ?? "").trim();
const extraHostname = (() => {
  try {
    return extraBase ? new URL(extraBase).hostname : "";
  } catch {
    return "";
  }
})();

if (!extraBase) {
  console.error("[verify-expo-public-config] expo.extra.apiBaseUrl is missing.");
  process.exit(1);
}

if (extraHostname !== hostname) {
  console.error(
    `[verify-expo-public-config] expo.extra hostname mismatch: expected ${hostname}, got ${extraHostname || "(unparseable)"}`
  );
  process.exit(1);
}

const normalizedPath = new URL(base).pathname;
const extraPath = new URL(extraBase).pathname;
if (normalizedPath !== extraPath) {
  console.error(
    `[verify-expo-public-config] expo.extra API path mismatch: expected ${normalizedPath}, got ${extraPath}`
  );
  process.exit(1);
}

console.log(`[verify-expo-public-config] expo.extra.apiBaseUrl hostname OK: ${hostname}`);
