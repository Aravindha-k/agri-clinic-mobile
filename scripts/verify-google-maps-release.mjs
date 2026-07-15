/**
 * Pre-release verification for Google Maps (react-native-maps) in GitHub Actions APK builds.
 * Never prints the full API key.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const META_NAME = "com.google.android.geo.API_KEY";
const PLACEHOLDER_KEYS = new Set([
  "",
  "YOUR_GOOGLE_MAPS_ANDROID_API_KEY",
  "your API key",
  "undefined",
  "null",
  "local-build-placeholder"
]);

/** Any obvious non-key sentinel value that must never reach a release APK. */
function isPlaceholderKey(value) {
  if (PLACEHOLDER_KEYS.has(value)) return true;
  const lowered = value.toLowerCase();
  return lowered.includes("placeholder") || lowered.includes("your_") || lowered.includes("replace");
}

const issues = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
}

function fail(msg) {
  issues.push(msg);
}

function read(rel) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function walkSource(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "android") continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkSource(full, out);
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function scanPattern(pattern, ignoreDirs = []) {
  const hits = [];
  const re = new RegExp(pattern, "i");
  for (const file of walkSource(ROOT)) {
    const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (ignoreDirs.some((d) => rel.includes(d))) continue;
    const text = readFileSync(file, "utf8");
    if (re.test(text)) hits.push(rel);
  }
  return hits;
}

console.log("=== Google Maps release verification ===\n");

const pkg = read("package.json") ?? "";
if (pkg.includes('"react-native-maps"')) {
  pass("package.json lists react-native-maps");
} else {
  fail("package.json missing react-native-maps");
}

if (pkg.includes("@maplibre/maplibre-react-native")) {
  fail("package.json still lists @maplibre/maplibre-react-native");
} else {
  pass("MapLibre is not a runtime dependency in package.json");
}

const maplibreImports = scanPattern(
  "@maplibre/maplibre-react-native|from ['\"]\\.\\/FieldMapViewMapLibre|mapLibreNative",
  ["GOOGLE_MAPS", "ANDROID_RELEASE", "verify-google-maps-release.mjs"]
);
if (maplibreImports.length === 0) {
  pass("No MapLibre runtime imports in source");
} else {
  fail(`MapLibre imports remain: ${maplibreImports.join(", ")}`);
}

const styleHits = scanPattern("EXPO_PUBLIC_MAP_STYLE_URL|tiles\\.openfreemap\\.org|demotiles\\.maplibre\\.org", [
  "verify-google-maps-release.mjs",
  "GOOGLE_MAPS",
  "GOOGLE_MAPS_HISTORICAL"
]);
if (styleHits.length === 0) {
  pass("No MapLibre style URL env references in source");
} else {
  fail(`MapLibre style URL references remain: ${styleHits.join(", ")}`);
}

const appConfig = read("app.config.js") ?? "";
if (appConfig.includes("GOOGLE_MAPS_ANDROID_API_KEY") && appConfig.includes("googleMaps")) {
  pass("app.config.js wires GOOGLE_MAPS_ANDROID_API_KEY to android.config.googleMaps");
} else {
  fail("app.config.js missing Google Maps Android API key config");
}

const workflow = read(".github/workflows/android-apk.yml") ?? "";
if (workflow.includes("GOOGLE_MAPS_ANDROID_API_KEY")) {
  pass("GitHub workflow exposes GOOGLE_MAPS_ANDROID_API_KEY");
} else {
  fail("GitHub workflow missing GOOGLE_MAPS_ANDROID_API_KEY env");
}

if (workflow.includes("verify-android-maps-config.mjs")) {
  pass("GitHub workflow verifies Android manifest Google Maps metadata");
} else {
  fail("GitHub workflow missing verify-android-maps-config.mjs step");
}

if (workflow.includes("verify-google-maps-release.mjs")) {
  pass("GitHub workflow runs verify-google-maps-release.mjs");
} else {
  fail("GitHub workflow missing verify-google-maps-release.mjs step");
}

const fieldMapView = read("src/components/map/FieldMapView.tsx") ?? "";
if (fieldMapView.includes("react-native-maps") && fieldMapView.includes("MapView")) {
  pass("FieldMapView uses react-native-maps MapView");
} else {
  fail("FieldMapView missing react-native-maps MapView");
}

if (!fieldMapView.includes("MapLibre") && !fieldMapView.includes("FieldMapViewMapLibre")) {
  pass("FieldMapView has no MapLibre fallback");
} else {
  fail("FieldMapView still references MapLibre");
}

if (
  fieldMapView.includes("showsUserLocation={showsUserLocation && locationGranted") ||
  fieldMapView.includes("showsUserLocation && locationGranted && !locationDenied")
) {
  pass("FieldMapView gates live user location on foreground permission");
} else {
  fail("FieldMapView missing permission guard for showsUserLocation");
}

const mapScreens = [
  "mobile/components/daySummary/DaySummaryRouteCard.tsx",
  "src/screens/map/MyLocationScreen.tsx",
  "src/screens/map/FarmerMapScreen.tsx",
  "src/components/TrackingLocationMap.tsx",
  "src/components/map/LocationPreviewMap.tsx"
];

for (const screen of mapScreens) {
  const text = read(screen);
  if (!text) {
    fail(`Map screen missing: ${screen}`);
    continue;
  }
  if (text.includes("FieldMapView") && !text.includes("FieldMapViewMapLibre")) {
    pass(`${screen} uses shared FieldMapView`);
  } else {
    fail(`${screen} does not use shared FieldMapView`);
  }
}

const farmerMap = read("src/screens/map/FarmerMapScreen.tsx") ?? "";
const visitPreview = read("src/components/map/LocationPreviewMap.tsx") ?? "";
if (farmerMap.includes("showsUserLocation={false}")) {
  pass("FarmerMapScreen defaults showLiveUserLocation off");
} else {
  fail("FarmerMapScreen should set showsUserLocation={false}");
}
if (visitPreview.includes("showsUserLocation={false}")) {
  pass("Visit location preview defaults showLiveUserLocation off");
} else {
  fail("LocationPreviewMap should set showsUserLocation={false}");
}

const manifestPath = join(ROOT, "android/app/src/main/AndroidManifest.xml");
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, "utf8");
  const patterns = [
    new RegExp(`android:name="${META_NAME}"\\s+android:value="([^"]*)"`, "i"),
    new RegExp(`android:value="([^"]*)"\\s+android:name="${META_NAME}"`, "i")
  ];
  let value = null;
  for (const pattern of patterns) {
    const match = manifest.match(pattern);
    if (match) {
      value = match[1]?.trim() ?? "";
      break;
    }
  }
  if (value == null) {
    fail(`AndroidManifest.xml missing ${META_NAME} metadata`);
  } else if (isPlaceholderKey(value)) {
    fail(`AndroidManifest Google Maps API key is empty or a placeholder ("${value}")`);
  } else {
    const masked = value.length < 8 ? "(too short)" : `${value.slice(0, 4)}…${value.slice(-4)}`;
    pass(`AndroidManifest ${META_NAME} present (${value.length} chars, ${masked})`);
  }
} else {
  issues.push("WARN: android/app/src/main/AndroidManifest.xml not found — run expo prebuild before release QA");
}

for (const msg of passes) {
  console.log(`  ✓ ${msg}`);
}
for (const msg of issues) {
  console.error(`  ✗ ${msg}`);
}

console.log(`\n${passes.length} passed, ${issues.filter((i) => !i.startsWith("WARN")).length} failed`);
if (issues.some((i) => !i.startsWith("WARN"))) {
  process.exit(1);
}
