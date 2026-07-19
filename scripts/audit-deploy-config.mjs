/**
 * Audit Expo deploy config — ensures release EAS profiles point at AWS, not LAN/Render.
 * Development profile may use LAN. Run: node scripts/audit-deploy-config.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PRODUCTION_API_HOST, PRODUCTION_API_BASE_URL, LOCAL_DEV_API_BASE_URL, normalizeApiBaseUrl } =
  require("../src/api/apiBaseUrl.js");

const ROOT = path.resolve(import.meta.dirname, "..");
const LAN_PATTERN = /localhost|127\.0\.0\.1|192\.168\.|10\.0\.2\.2/i;
const RENDER_PATTERN = /onrender\.com/i;

const issues = [];
const ok = [];

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function checkEasProfile(name, env) {
  const url = env?.EXPO_PUBLIC_API_BASE_URL || env?.EXPO_PUBLIC_API_URL;
  if (!url) {
    issues.push(`eas.json profile "${name}": missing EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_URL`);
    return;
  }

  if (name === "development") {
    if (!LAN_PATTERN.test(url) && !url.includes(PRODUCTION_API_HOST)) {
      issues.push(`eas.json profile "development": unexpected API URL (${url})`);
      return;
    }
    ok.push(`eas.json profile "development": ${url} → ${normalizeApiBaseUrl(url)}`);
    return;
  }

  if (!url.includes(PRODUCTION_API_HOST)) {
    issues.push(`eas.json profile "${name}": API URL is not AWS production (${url})`);
    return;
  }
  if (LAN_PATTERN.test(url)) {
    issues.push(`eas.json profile "${name}": contains LAN/localhost URL`);
    return;
  }
  if (RENDER_PATTERN.test(url)) {
    issues.push(`eas.json profile "${name}": still points at Render`);
    return;
  }
  ok.push(`eas.json profile "${name}": ${url} → ${normalizeApiBaseUrl(url)}`);
}

const eas = JSON.parse(read("eas.json") ?? "{}");
for (const [profile, cfg] of Object.entries(eas.build ?? {})) {
  const merged = cfg.extends
    ? { ...eas.build[cfg.extends], ...cfg, env: { ...eas.build[cfg.extends]?.env, ...cfg.env } }
    : cfg;
  checkEasProfile(profile, merged.env);
}

const prodEnv = read(".env.production");
if (!prodEnv) {
  issues.push(".env.production: missing");
} else if (!prodEnv.includes(PRODUCTION_API_HOST)) {
  issues.push(".env.production: does not set AWS URL");
} else if (LAN_PATTERN.test(prodEnv.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n"))) {
  issues.push(".env.production: contains LAN/localhost");
} else if (RENDER_PATTERN.test(prodEnv)) {
  issues.push(".env.production: still points at Render");
} else {
  const match =
    prodEnv.match(/EXPO_PUBLIC_API_BASE_URL=(.+)/) || prodEnv.match(/EXPO_PUBLIC_API_URL=(.+)/);
  ok.push(`.env.production: AWS URL set → ${normalizeApiBaseUrl(match?.[1] ?? "")}`);
}

const devEnv = read(".env.development");
if (!devEnv) {
  issues.push(".env.development: missing");
} else if (!devEnv.includes("192.168.29.18")) {
  issues.push(".env.development: missing local LAN API URL");
} else {
  ok.push(`.env.development: local API → ${LOCAL_DEV_API_BASE_URL}`);
}

const apiBase = read("src/api/apiBaseUrl.js") ?? "";
if (!apiBase.includes(PRODUCTION_API_HOST)) {
  issues.push("src/api/apiBaseUrl.js: missing AWS production host");
} else if (RENDER_PATTERN.test(apiBase)) {
  issues.push("src/api/apiBaseUrl.js: still references Render");
} else {
  ok.push(`src/api/apiBaseUrl.js: AWS base → ${PRODUCTION_API_BASE_URL}`);
  ok.push(`src/api/apiBaseUrl.js: local base → ${LOCAL_DEV_API_BASE_URL}`);
}

const configTs = read("src/api/config.ts") ?? "";
if (!configTs.includes("apiBaseUrl") && !configTs.includes("resolveApiConfig")) {
  issues.push("src/api/config.ts: missing canonical resolver");
} else {
  ok.push("src/api/config.ts: uses canonical resolver");
}

console.log("=== Agri Clinic deploy config audit ===\n");
for (const line of ok) console.log(`  ✓ ${line}`);
for (const line of issues) console.log(`  ✗ ${line}`);
console.log(`\n${ok.length} passed, ${issues.length} issue(s).`);
process.exit(issues.length ? 1 : 0);
