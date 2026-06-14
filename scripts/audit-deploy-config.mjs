/**
 * Audit Expo deploy config — ensures EAS profiles point at Render, not LAN.
 * Run: node scripts/audit-deploy-config.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RENDER = "https://agri-clinic-backend.onrender.com/api/v1/";
const LAN_PATTERN = /localhost|127\.0\.0\.1|192\.168\.|10\.0\.2\.2/i;

const issues = [];
const ok = [];

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function checkEasProfile(name, env) {
  const url = env?.EXPO_PUBLIC_API_URL;
  if (!url) {
    issues.push(`eas.json profile "${name}": missing EXPO_PUBLIC_API_URL`);
    return;
  }
  if (url !== RENDER) {
    issues.push(`eas.json profile "${name}": API URL is not Render (${url})`);
    return;
  }
  if (LAN_PATTERN.test(url)) {
    issues.push(`eas.json profile "${name}": contains LAN/localhost URL`);
    return;
  }
  ok.push(`eas.json profile "${name}": ${url}`);
}

const eas = JSON.parse(read("eas.json") ?? "{}");
for (const [profile, cfg] of Object.entries(eas.build ?? {})) {
  const merged = cfg.extends ? { ...eas.build[cfg.extends], ...cfg, env: { ...eas.build[cfg.extends]?.env, ...cfg.env } } : cfg;
  checkEasProfile(profile, merged.env);
}

const prodEnv = read(".env.production");
if (!prodEnv) {
  issues.push(".env.production: missing");
} else if (!prodEnv.includes(RENDER)) {
  issues.push(".env.production: does not set Render URL");
} else if (LAN_PATTERN.test(prodEnv)) {
  issues.push(".env.production: contains LAN/localhost");
} else {
  ok.push(".env.production: Render URL set");
}

const appConfig = read("app.config.js") ?? "";
if (appConfig.includes("192.168") || appConfig.includes("10.0.2.2")) {
  issues.push("app.config.js: contains hardcoded LAN IP (should only use env/Render constant)");
} else {
  ok.push("app.config.js: no LAN IPs hardcoded");
}

const apiConfig = read("src/api/config.ts") ?? "";
if (!apiConfig.includes("agri-clinic-backend.onrender.com")) {
  issues.push("src/api/config.ts: missing Render production URL fallback");
} else {
  ok.push("src/api/config.ts: Render fallback present");
}

console.log("=== Agri Clinic deploy config audit ===\n");
for (const line of ok) console.log(`  ✓ ${line}`);
for (const line of issues) console.log(`  ✗ ${line}`);
console.log(`\n${ok.length} passed, ${issues.length} issue(s).`);
process.exit(issues.length ? 1 : 0);
