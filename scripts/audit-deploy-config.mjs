/**
 * Audit Expo deploy config — ensures EAS/GitHub profiles point at AWS production, not LAN/Render.
 * Run: node scripts/audit-deploy-config.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PRODUCTION_HOST = "13.207.17.117";
const PRODUCTION_API_BASE = `http://${PRODUCTION_HOST}/api/v1/`;
const LAN_PATTERN = /localhost|127\.0\.0\.1|192\.168\.|10\.0\.2\.2/i;
const RENDER_PATTERN = /onrender\.com/i;

const issues = [];
const ok = [];

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function normalizeApiBaseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return PRODUCTION_API_BASE;
  let url = trimmed.replace(/\/+$/, "");
  url = url.replace(/(\/api\/v1)+$/i, "/api/v1");
  if (!/\/api\/v1$/i.test(url)) {
    if (/\/api$/i.test(url)) {
      url = `${url}/v1`;
    } else {
      url = `${url}/api/v1`;
    }
  }
  return `${url}/`;
}

function checkEasProfile(name, env) {
  const url = env?.EXPO_PUBLIC_API_URL;
  if (!url) {
    issues.push(`eas.json profile "${name}": missing EXPO_PUBLIC_API_URL`);
    return;
  }
  if (!url.includes(PRODUCTION_HOST)) {
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
  const merged = cfg.extends ? { ...eas.build[cfg.extends], ...cfg, env: { ...eas.build[cfg.extends]?.env, ...cfg.env } } : cfg;
  checkEasProfile(profile, merged.env);
}

const prodEnv = read(".env.production");
if (!prodEnv) {
  issues.push(".env.production: missing");
} else if (!prodEnv.includes(PRODUCTION_HOST)) {
  issues.push(".env.production: does not set AWS URL");
} else if (LAN_PATTERN.test(prodEnv)) {
  issues.push(".env.production: contains LAN/localhost");
} else if (RENDER_PATTERN.test(prodEnv)) {
  issues.push(".env.production: still points at Render");
} else {
  const match = prodEnv.match(/EXPO_PUBLIC_API_URL=(.+)/);
  ok.push(`.env.production: AWS URL set → ${normalizeApiBaseUrl(match?.[1] ?? "")}`);
}

const appConfig = read("app.config.js") ?? "";
if (appConfig.includes("192.168") || appConfig.includes("10.0.2.2")) {
  issues.push("app.config.js: contains hardcoded LAN IP");
} else if (!appConfig.includes(PRODUCTION_HOST)) {
  issues.push("app.config.js: missing AWS production URL");
} else {
  ok.push(`app.config.js: AWS host set → ${PRODUCTION_API_BASE}`);
}

const apiConfig = read("src/api/config.ts") ?? "";
if (!apiConfig.includes(PRODUCTION_HOST)) {
  issues.push("src/api/config.ts: missing AWS production URL fallback");
} else if (RENDER_PATTERN.test(apiConfig)) {
  issues.push("src/api/config.ts: still references Render");
} else {
  ok.push(`src/api/config.ts: AWS fallback present → ${PRODUCTION_API_BASE}`);
}

console.log("=== Agri Clinic deploy config audit ===\n");
for (const line of ok) console.log(`  ✓ ${line}`);
for (const line of issues) console.log(`  ✗ ${line}`);
console.log(`\n${ok.length} passed, ${issues.length} issue(s).`);
process.exit(issues.length ? 1 : 0);
