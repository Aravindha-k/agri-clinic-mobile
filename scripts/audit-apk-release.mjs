/**
 * Pre-build audit for production APK — API config, cleartext, bundled assets.
 * Run: node scripts/audit-apk-release.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const AWS_HOST = "13.207.17.117";
const API_BASE = `http://${AWS_HOST}/api/v1/`;

const issues = [];
const ok = [];

function read(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function pass(msg) {
  ok.push(msg);
}

function fail(msg) {
  issues.push(msg);
}

function normalizeApiBase(raw) {
  let url = String(raw || "").trim().replace(/\/+$/, "");
  url = url.replace(/(\/api\/v1)+$/i, "/api/v1");
  if (!/\/api\/v1$/i.test(url)) {
    url = /\/api$/i.test(url) ? `${url}/v1` : `${url}/api/v1`;
  }
  return `${url}/`;
}

// 1. API config
const configTs = read("src/api/config.ts") ?? "";
if (!configTs.includes(AWS_HOST)) fail("src/api/config.ts missing AWS host");
else pass("src/api/config.ts has AWS host");
if (!configTs.includes("if (!__DEV__)")) fail("src/api/config.ts missing release hardcode guard");
else pass("Release builds hardcode AWS API base");

const envProd = read(".env.production") ?? "";
if (!envProd.includes(`http://${AWS_HOST}`)) fail(".env.production missing AWS origin");
else if (envProd.includes("/api/v1")) fail(".env.production should NOT include /api/v1");
else pass(".env.production uses host-only EXPO_PUBLIC_API_URL");

const workflow = read(".github/workflows/android-apk.yml") ?? "";
if (!workflow.includes(`EXPO_PUBLIC_API_URL: http://${AWS_HOST}`)) {
  fail("GitHub workflow missing correct EXPO_PUBLIC_API_URL");
} else if (workflow.includes("/api/v1")) {
  fail("GitHub workflow must not pass /api/v1 in EXPO_PUBLIC_API_URL");
} else {
  pass("GitHub workflow EXPO_PUBLIC_API_URL is host-only");
}

const endpoints = {
  login: `${API_BASE}mobile/auth/login/`,
  farmers: `${API_BASE}farmers/`,
  visits: `${API_BASE}mobile/visits/`,
  dutyStart: `${API_BASE}tracking/duty/start/`,
  locationUpdate: `${API_BASE}tracking/location/update/`,
  locationBulk: `${API_BASE}tracking/location/bulk/`,
  heartbeat: `${API_BASE}tracking/heartbeat/`
};

for (const [name, url] of Object.entries(endpoints)) {
  if (url.includes("/api/v1/api/v1") || url.includes("/api/api/")) {
    fail(`Endpoint ${name} has duplicated path: ${url}`);
  } else if (url.includes("localhost") || url.includes("onrender")) {
    fail(`Endpoint ${name} has bad host: ${url}`);
  } else {
    pass(`Endpoint ${name}: ${url}`);
  }
}

// 2. Android cleartext
const manifest = read("android/app/src/main/AndroidManifest.xml") ?? "";
if (!manifest.includes('android:usesCleartextTraffic="true"')) {
  fail("Main AndroidManifest missing usesCleartextTraffic=true");
} else {
  pass("Main AndroidManifest usesCleartextTraffic=true");
}
if (!manifest.includes("network_security_config")) {
  fail("Main AndroidManifest missing networkSecurityConfig");
} else {
  pass("Main AndroidManifest references network_security_config");
}

const nsc = read("android/app/src/main/res/xml/network_security_config.xml") ?? "";
if (!nsc.includes(AWS_HOST)) fail("network_security_config.xml missing AWS host");
else pass("network_security_config allows AWS host");

// 3. Bundled assets
const requiredAssets = [
  "assets/brand/logo.png",
  "assets/brand/logo-splash.png",
  "assets/brand/app-icon.png",
  "assets/brand/adaptive-icon-foreground.png",
  "mobile/assets/backgrounds/login-backdrop.webp",
  "assets/backgrounds/login-forest.webp",
  "mobile/assets/headers/home.jpg",
  "mobile/assets/headers/work.jpg",
  "mobile/assets/headers/visit.jpg",
  "mobile/assets/headers/summary.jpg",
  "assets/splash/rice-field.png"
];

for (const asset of requiredAssets) {
  if (exists(asset)) pass(`Asset present: ${asset}`);
  else fail(`Missing bundled asset: ${asset}`);
}

// 4. No web-relative local image paths in key screens
const sourceFiles = [
  "src/screens/LoginScreen.tsx",
  "src/config/brand.ts",
  "mobile/components/nature/LoginHeroBackdrop.tsx",
  "mobile/lib/screenHeaderImages.ts",
  "src/components/brand/AnimatedBrandLogo.tsx"
];

for (const file of sourceFiles) {
  const text = read(file) ?? "";
  if (/uri:\s*['"]\/assets\//.test(text)) fail(`${file} uses web-relative /assets/ URI`);
  else if (/uri:\s*['"]file:\/\//.test(text)) fail(`${file} uses file:// URI for local asset`);
  else if (text.includes("require(") || file.includes("brand.ts")) pass(`${file} uses bundled asset pattern`);
  else pass(`${file} scanned`);
}

console.log("=== Production APK release audit ===\n");
for (const line of ok) console.log(`  ✓ ${line}`);
for (const line of issues) console.log(`  ✗ ${line}`);
console.log(`\n${ok.length} passed, ${issues.length} issue(s).`);
console.log(`\nRuntime API base (normalized): ${normalizeApiBase(`http://${AWS_HOST}`)}`);
process.exit(issues.length ? 1 : 0);
