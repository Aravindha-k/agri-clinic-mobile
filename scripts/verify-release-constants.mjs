/**
 * Prints expected release APK constants (no device required).
 * Run: node scripts/verify-release-constants.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const AWS_HOST = "13.207.17.117";
const EXPECTED_API_BASE = `http://${AWS_HOST}/api/v1/`;
const EXPECTED_LOGIN = `${EXPECTED_API_BASE}mobile/auth/login/`;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function normalizeApiBase(raw) {
  let url = String(raw || "").trim().replace(/\/+$/, "");
  url = url.replace(/(\/api\/v1)+$/i, "/api/v1");
  if (!/\/api\/v1$/i.test(url)) {
    url = /\/api$/i.test(url) ? `${url}/v1` : `${url}/api/v1`;
  }
  return `${url}/`;
}

const configTs = read("src/api/config.ts");
const envProd = fs.existsSync(path.join(ROOT, ".env.production"))
  ? read(".env.production")
  : "";
const workflow = fs.existsSync(path.join(ROOT, ".github/workflows/android-apk.yml"))
  ? read(".github/workflows/android-apk.yml")
  : "";

const checks = [];

if (configTs.includes('if (!__DEV__)') && configTs.includes("return PRODUCTION_API_BASE_URL")) {
  checks.push(["Release hardcodes AWS when __DEV__ is false", true]);
} else {
  checks.push(["Release hardcodes AWS when __DEV__ is false", false]);
}

if (configTs.includes(AWS_HOST)) {
  checks.push(["config.ts contains AWS host", true]);
} else {
  checks.push(["config.ts contains AWS host", false]);
}

const envMatch = envProd.match(/EXPO_PUBLIC_API_URL=(.+)/);
const envUrl = envMatch?.[1]?.trim() ?? "";
if (envUrl && envUrl.includes(AWS_HOST) && !envUrl.includes("/api/v1")) {
  checks.push([".env.production host-only EXPO_PUBLIC_API_URL", true]);
} else if (!envProd) {
  checks.push([".env.production host-only EXPO_PUBLIC_API_URL", "missing file"]);
} else {
  checks.push([".env.production host-only EXPO_PUBLIC_API_URL", false]);
}

if (workflow.includes(`EXPO_PUBLIC_API_URL: http://${AWS_HOST}`)) {
  checks.push(["GHA workflow EXPO_PUBLIC_API_URL", true]);
} else {
  checks.push(["GHA workflow EXPO_PUBLIC_API_URL", false]);
}

const normalizedFromEnv = normalizeApiBase(envUrl || `http://${AWS_HOST}`);
checks.push([
  "Normalized API base from env",
  normalizedFromEnv === EXPECTED_API_BASE ? normalizedFromEnv : `expected ${EXPECTED_API_BASE}, got ${normalizedFromEnv}`
]);

console.log("=== Release APK expected constants ===\n");
console.log("__DEV__ false behavior:");
console.log(`  API_BASE_URL → ${EXPECTED_API_BASE}`);
console.log(`  Login URL    → ${EXPECTED_LOGIN}`);
console.log(`  Never uses LAN (192.168.x) in release\n`);

console.log("Build-time env:");
console.log(`  EXPO_PUBLIC_API_URL (production): ${envUrl || "(unset)"}`);
console.log(`  Normalized runtime base: ${normalizedFromEnv}\n`);

console.log("Checks:");
let failed = 0;
for (const [label, ok] of checks) {
  const pass = ok === true || (typeof ok === "string" && ok.startsWith("http"));
  if (!pass) failed += 1;
  console.log(`  ${pass ? "✓" : "✗"} ${label}${typeof ok === "string" ? `: ${ok}` : ""}`);
}

console.log(`\n${failed === 0 ? "All checks passed." : `${failed} check(s) failed.`}`);
process.exit(failed ? 1 : 0);
