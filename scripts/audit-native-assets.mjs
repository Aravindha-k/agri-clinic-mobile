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
  ["logoAsset", "./assets/brand/logo_circle_transparent.png"],
  ["iconAsset", "./assets/brand/app_icon.png"],
  ["adaptiveIconAsset", "./assets/brand/adaptive_icon_foreground.png"]
];

for (const [name, fallback] of assetPaths) {
  const match = brandConfig.match(new RegExp(`${name}:\\s*"([^"]+)"`));
  const rel = (match?.[1] ?? fallback).replace(/^\.\//, "");
  if (exists(rel)) pass(`Bundled asset: ${rel}`);
  else fail(`Missing bundled asset: ${rel} (${name})`);
}

if (exists("assets/brand/logo_circle_transparent.png")) {
  pass("Canonical in-app / splash logo: assets/brand/logo_circle_transparent.png");
} else {
  fail("Missing assets/brand/logo_circle_transparent.png");
}

if (exists("assets/brand/adaptive_icon_foreground.png")) pass("Adaptive foreground: assets/brand/adaptive_icon_foreground.png");
else fail("Missing assets/brand/adaptive_icon_foreground.png");

if (exists("assets/brand/app_icon.png")) pass("Legacy launcher: assets/brand/app_icon.png");
else fail("Missing assets/brand/app_icon.png");

  if (exists("assets/splash/sky_background.jpg")) pass("Splash sky: assets/splash/sky_background.jpg");
  else if (exists("assets/splash/rice_field.png")) pass("React splash poster: assets/splash/rice_field.png");
  else if (exists("assets/splash/premium_background.png")) pass("Splash background: assets/splash/premium_background.png");
  else fail("Missing splash background art");

  if (exists("assets/splash/product_pile.png")) pass("Splash product pile: assets/splash/product_pile.png");
  else if (exists("assets/splash/premium_background.png")) pass("Splash uses premium_background (product_pile optional)");
  else fail("Missing assets/splash/product_pile.png");

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

if (styles.includes("splashscreen_icon") || styles.includes("splashscreen_logo")) {
  pass("styles.xml references native splash drawable");
} else {
  fail("styles.xml missing splashscreen_icon drawable");
}

const colors = read("android/app/src/main/res/values/colors.xml") ?? "";
if (colors.includes("splashscreen_background")) pass("colors.xml splashscreen_background");
else fail("colors.xml missing splashscreen_background");

const manifest = read("android/app/src/main/AndroidManifest.xml") ?? "";
if (manifest.includes("Theme.App.SplashScreen")) pass("AndroidManifest uses splash theme");
else fail("AndroidManifest missing Theme.App.SplashScreen");

const appConfig = read("app.config.js") ?? "";
if (appConfig.includes("expo-splash-screen")) pass("app.config.js expo-splash-screen plugin");
else fail("app.config.js missing expo-splash-screen plugin");

if (appConfig.includes("nativeSplashBackgroundColor") || appConfig.includes("expo-splash-screen")) {
  pass("app.config.js native splash configured");
} else {
  fail("app.config.js native splash not configured");
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
