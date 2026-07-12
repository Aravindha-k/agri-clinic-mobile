/**
 * Pre-release verification for MapLibre native maps in GitHub Actions APK builds.
 * Run after `expo prebuild --platform android` in CI, or locally with production env.
 *
 * Exit 1 on any blocking issue.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEMO_STYLE = "https://demotiles.maplibre.org/style.json";

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

function scanCodeForPattern(label, pattern, allowlist = []) {
  const hits = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      if (name.name.startsWith(".") || name.name === "node_modules") continue;
      const full = path.join(dir, name.name);
      if (name.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(tsx?|jsx?|mjs|json|yml|yaml|js)$/.test(name.name)) continue;
      if (allowlist.some((a) => full.includes(a.replace(/\//g, path.sep)))) continue;
      const text = fs.readFileSync(full, "utf8");
      if (pattern.test(text)) hits.push(path.relative(ROOT, full));
    }
  }
  walk(ROOT);
  return [...new Set(hits)];
}

// 1–2. Map package dependencies
const pkg = read("package.json") ?? "";
const lock = read("package-lock.json") ?? "";
if (pkg.includes('"@maplibre/maplibre-react-native"')) pass("package.json lists @maplibre/maplibre-react-native");
else fail("package.json missing @maplibre/maplibre-react-native");

if (!pkg.includes('"react-native-maps"') && !lock.includes('"react-native-maps"')) {
  pass("react-native-maps removed from package.json and lockfile");
} else {
  fail("react-native-maps still present in package.json or package-lock.json");
}

const maplibreImports = scanCodeForPattern(
  "react-native-maps imports",
  /from\s+["']react-native-maps["']/,
  ["node_modules", "MAPLIBRE", "ANDROID_RELEASE"]
);
if (maplibreImports.length === 0) pass("No react-native-maps imports in source");
else fail(`react-native-maps imports remain: ${maplibreImports.join(", ")}`);

// 3–4. Expo config
const appConfig = read("app.config.js") ?? "";
if (appConfig.includes("@maplibre/maplibre-react-native") && appConfig.includes("mapStyleUrl")) {
  pass("app.config.js includes MapLibre plugin and mapStyleUrl extra");
} else {
  fail("app.config.js missing MapLibre plugin or mapStyleUrl");
}

if (exists("node_modules/@maplibre/maplibre-react-native/android/build.gradle")) {
  pass("MapLibre Android native module present in node_modules");
} else {
  fail("node_modules/@maplibre/maplibre-react-native/android missing — run npm ci");
}

// 5. Android manifest (post-prebuild)
const manifest = read("android/app/src/main/AndroidManifest.xml") ?? "";
if (manifest.includes("INTERNET")) pass("AndroidManifest includes INTERNET permission (required for tiles)");
else fail("AndroidManifest missing INTERNET permission");

if (manifest.includes("com.google.android.geo.API_KEY")) {
  fail("AndroidManifest still contains Google Maps API key metadata");
} else {
  pass("AndroidManifest has no Google Maps API key metadata");
}

// 6. Google Maps env references
const googleRefs = scanCodeForPattern(
  "GOOGLE_MAPS",
  /GOOGLE_MAPS_ANDROID_API_KEY|googleMaps\.apiKey|com\.google\.android\.geo\.API_KEY/,
  [
    "MAPLIBRE",
    "MAP_TILE",
    "ANDROID_RELEASE",
    "ANDROID_MAPS",
    "node_modules",
    ".md",
    "verify-maplibre-release.mjs"
  ]
).filter((f) => !f.endsWith(".md"));
if (googleRefs.length === 0) pass("No active GOOGLE_MAPS_ANDROID_API_KEY configuration in code/scripts");
else fail(`Google Maps config references remain: ${googleRefs.join(", ")}`);

// 7–9. GitHub Actions workflow
const workflow = read(".github/workflows/android-apk.yml") ?? "";
if (workflow.includes("npm ci")) pass("GitHub workflow runs npm ci");
else fail("GitHub workflow missing npm ci");

const prebuildIdx = workflow.indexOf("expo prebuild");
const gradleIdx = workflow.indexOf("assembleRelease");
if (prebuildIdx >= 0 && gradleIdx > prebuildIdx) {
  pass("GitHub workflow runs expo prebuild before assembleRelease");
} else {
  fail("GitHub workflow order wrong — prebuild must precede Gradle assembleRelease");
}

if (workflow.includes("EXPO_PUBLIC_MAP_STYLE_URL") && workflow.includes(DEMO_STYLE)) {
  pass(`GitHub workflow sets EXPO_PUBLIC_MAP_STYLE_URL (${DEMO_STYLE})`);
} else {
  fail("GitHub workflow missing EXPO_PUBLIC_MAP_STYLE_URL with demo style fallback");
}

if (workflow.includes("verify-maplibre-release.mjs")) {
  pass("GitHub workflow runs verify-maplibre-release.mjs after prebuild");
} else {
  fail("GitHub workflow missing MapLibre verification step");
}

// 10. Runtime style resolver
const mapStyleTs = read("src/config/mapStyle.ts") ?? "";
if (mapStyleTs.includes("MAPLIBRE_DEMO_STYLE_URL") && mapStyleTs.includes('env === "production"')) {
  pass("mapStyle.ts production path falls back to MapLibre demo tiles when URL unset");
} else {
  fail("mapStyle.ts missing production demo-style fallback");
}

// 11–13. Expo Go only paths
const fieldMapView = read("src/components/map/FieldMapView.tsx") ?? "";
if (fieldMapView.includes("isExpoGo()") && fieldMapView.includes("FieldMapViewSchematic")) {
  pass("FieldMapView uses schematic only when isExpoGo()");
} else {
  fail("FieldMapView must route schematic only through isExpoGo()");
}

if (!fieldMapView.includes("isMapLibreNativeAvailable")) {
  pass("FieldMapView does not gate APK builds on TurboModule pre-check");
} else {
  fail("FieldMapView still uses isMapLibreNativeAvailable — APK may show SVG fallback");
}

const schematic = read("src/components/map/FieldMapViewSchematic.tsx") ?? "";
if (schematic.includes("Route preview · live tiles in dev build") && schematic.includes("isExpoGo()")) {
  pass("Expo Go hint text guarded by isExpoGo() in FieldMapViewSchematic");
} else {
  fail("FieldMapViewSchematic hint not guarded by isExpoGo()");
}

if (fieldMapView.includes("FieldMapViewMapLibre") || fieldMapView.includes("LazyFieldMapViewMapLibre")) {
  pass("FieldMapView lazy-loads native MapLibre on non–Expo Go builds");
} else {
  fail("FieldMapView missing lazy MapLibre import for release builds");
}

// 14. Screen coverage (all use FieldMapView)
const screens = [
  "mobile/components/daySummary/DaySummaryRouteCard.tsx",
  "src/screens/map/MyLocationScreen.tsx",
  "src/screens/map/FarmerMapScreen.tsx",
  "src/components/TrackingLocationMap.tsx",
  "src/components/map/LocationPreviewMap.tsx"
];
for (const screen of screens) {
  const text = read(screen) ?? "";
  if (text.includes("FieldMapView")) pass(`Map screen uses FieldMapView: ${screen}`);
  else fail(`Map screen missing FieldMapView: ${screen}`);
}

// Evaluate app.config with CI-like env when available
if (process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim()) {
  pass(`Build env EXPO_PUBLIC_MAP_STYLE_URL=${process.env.EXPO_PUBLIC_MAP_STYLE_URL.trim()}`);
} else {
  issues.push("WARN: EXPO_PUBLIC_MAP_STYLE_URL not set in current shell (CI job env sets it)");
}

console.log("=== MapLibre release verification ===\n");
for (const line of ok) console.log(`  ✓ ${line}`);
for (const line of issues) console.log(`  ✗ ${line}`);
console.log(`\n${ok.length} passed, ${issues.filter((i) => !i.startsWith("WARN:")).length} blocking issue(s).`);

const blocking = issues.filter((i) => !i.startsWith("WARN:"));
process.exit(blocking.length ? 1 : 0);
