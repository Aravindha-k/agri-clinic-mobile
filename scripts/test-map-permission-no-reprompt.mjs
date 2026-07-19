/**
 * Map screens must never re-prompt OS location dialogs.
 * Permissions are collected once in Field Tracking Setup after login.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustNot(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(!src.includes(needle), `${label}: unexpected "${needle}" in ${file}`);
  }
}

function must(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(src.includes(needle), `${label}: missing "${needle}" in ${file}`);
  }
}

const mapSurfaces = [
  "src/components/TrackingLocationMap.tsx",
  "src/screens/map/FarmerMapScreen.tsx",
  "src/screens/map/MyLocationScreen.tsx",
  "src/hooks/useMyLocationScreen.ts",
  "mobile/components/duty/DutyMapCard.tsx",
  "src/components/map/LocationPreviewMap.tsx",
  "src/screens/HomeScreen.tsx"
];

for (const file of mapSurfaces) {
  mustNot(
    file,
    ["requestForegroundPermissionsAsync", "requestBackgroundPermissionsAsync", "ensureForegroundPermission("],
    `map no OS prompt — ${file}`
  );
}

must(
  "src/components/TrackingLocationMap.tsx",
  ["readForegroundLocationIfGranted"],
  "tracking map get-only"
);

must(
  "src/screens/map/FarmerMapScreen.tsx",
  ["getForegroundPermissionsAsync"],
  "farmer map check-only"
);

must(
  "src/utils/location.ts",
  ["checkForegroundPermission", "readForegroundLocationIfGranted"],
  "location helpers"
);

must(
  "src/features/fieldTrackingSetup/ensureForegroundLocation.ts",
  ["requestForegroundPermissionsAsync", "ensureForegroundLocationPermission"],
  "setup still requests once via single-flight helper"
);

// Only the canonical foreground helper may request OS location dialogs
function collectTsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === "android" ||
      entry.name === "ios" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTsFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const offenders = [];
for (const file of collectTsFiles(root)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel === "src/features/fieldTrackingSetup/ensureForegroundLocation.ts") continue;
  const src = fs.readFileSync(file, "utf8");
  if (
    src.includes("requestForegroundPermissionsAsync") ||
    src.includes("requestBackgroundPermissionsAsync")
  ) {
    offenders.push(rel);
  }
}
assert.deepEqual(
  offenders,
  [],
  `OS location request must only live in ensureForegroundLocation.ts; found: ${offenders.join(", ")}`
);

console.log("PASS map-permission-no-reprompt");
