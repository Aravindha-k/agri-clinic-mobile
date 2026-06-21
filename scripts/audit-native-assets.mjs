/**
 * Verifies native splash/icon assets for Android release builds.
 * Run: node scripts/audit-native-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const issues = [];
const ok = [];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function pass(msg) {
  ok.push(msg);
}

function fail(msg) {
  issues.push(msg);
}

function read(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}

const brandConfig = read("src/config/brand.config.js") ?? "";
const assetPaths = [
  ["logoAsset", "./assets/brand/logo.png"],
  ["iconAsset", "./assets/brand/app-icon.png"],
  ["adaptiveIconAsset", "./assets/brand/adaptive-icon-foreground.png"]
];

for (const [name, fallback] of assetPaths) {
  const match = brandConfig.match(new RegExp(`${name}:\\s*"([^"]+)"`));
  const rel = (match?.[1] ?? fallback).replace(/^\.\//, "");
  if (exists(rel)) pass(`Bundled asset: ${rel}`);
  else fail(`Missing bundled asset: ${rel} (${name})`);
}

if (exists("assets/brand/logo-splash.png")) pass("Boot splash logo: assets/brand/logo-splash.png");
else fail("Missing assets/brand/logo-splash.png (BootSplash)");

if (exists("assets/splash/rice-field.png")) pass("React splash poster: assets/splash/rice-field.png");
else fail("Missing assets/splash/rice-field.png");

const splashDensities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
for (const density of splashDensities) {
  const rel = `android/app/src/main/res/drawable-${density}/splashscreen_logo.png`;
  if (exists(rel)) pass(`Android native splash: ${rel}`);
  else fail(`Missing ${rel}`);
}

const mipmapDensities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
for (const density of mipmapDensities) {
  const rel = `android/app/src/main/res/mipmap-${density}/ic_launcher.webp`;
  if (exists(rel)) pass(`Android launcher icon: ${rel}`);
  else fail(`Missing ${rel}`);
}

if (exists("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml")) {
  pass("Adaptive icon XML present");
} else {
  fail("Missing mipmap-anydpi-v26/ic_launcher.xml");
}

const styles = read("android/app/src/main/res/values/styles.xml") ?? "";
if (styles.includes("Theme.App.SplashScreen")) pass("styles.xml Theme.App.SplashScreen");
else fail("styles.xml missing Theme.App.SplashScreen");

if (styles.includes("splashscreen_logo")) pass("styles.xml references splashscreen_logo");
else fail("styles.xml missing splashscreen_logo drawable");

const colors = read("android/app/src/main/res/values/colors.xml") ?? "";
if (colors.includes("splashscreen_background")) pass("colors.xml splashscreen_background");
else fail("colors.xml missing splashscreen_background");

const manifest = read("android/app/src/main/AndroidManifest.xml") ?? "";
if (manifest.includes("Theme.App.SplashScreen")) pass("AndroidManifest uses splash theme");
else fail("AndroidManifest missing Theme.App.SplashScreen");

const appConfig = read("app.config.js") ?? "";
if (appConfig.includes("expo-splash-screen")) pass("app.config.js expo-splash-screen plugin");
else fail("app.config.js missing expo-splash-screen plugin");

if (appConfig.includes("logo.png") || appConfig.includes("logoAsset")) {
  pass("app.config.js splash image configured");
} else {
  fail("app.config.js splash image not configured");
}

console.log("=== Native splash / icon asset audit ===\n");
for (const line of ok) console.log(`  ✓ ${line}`);
for (const line of issues) console.log(`  ✗ ${line}`);
console.log(`\n${ok.length} passed, ${issues.length} issue(s).`);
if (brandConfig.includes("splashBackgroundColor")) {
  const bg = brandConfig.match(/splashBackgroundColor:\s*"([^"]+)"/)?.[1];
  console.log(`\nConfigured splash background: ${bg ?? "unknown"}`);
}
process.exit(issues.length ? 1 : 0);
