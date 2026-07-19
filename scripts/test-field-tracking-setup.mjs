/**
 * Field Tracking setup — foreground location only (no background / App Info redirects).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(src.includes(needle), `${label}: missing "${needle}" in ${file}`);
  }
}

function mustNot(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(!src.includes(needle), `${label}: unexpected "${needle}" in ${file}`);
  }
}

must(
  "src/features/fieldTrackingSetup/ensureForegroundLocation.ts",
  [
    "ensureForegroundLocationPermission",
    "enableLocationForFieldWork",
    "permissionInFlight",
    "getForegroundPermissionsAsync",
    "requestForegroundPermissionsAsync",
    "hasServicesEnabledAsync",
    "isPermanentlyDenied",
    'status === "denied" && response.canAskAgain === false',
    "Location permission is disabled. Enable it from app settings to use field tracking."
  ],
  "single-flight foreground permission service"
);

mustNot(
  "src/features/fieldTrackingSetup/ensureForegroundLocation.ts",
  ["requestBackgroundPermissionsAsync", "openSettings", "Linking.openSettings"],
  "no background request / auto settings in ensureForeground"
);

must(
  "src/features/fieldTrackingSetup/actions.ts",
  ["enableLocationForFieldWork", "skipped_foreground_only", "openedSettings: false"],
  "actions use enable flow; background is no-op"
);

mustNot(
  "src/features/fieldTrackingSetup/actions.ts",
  ["requestBackgroundPermissionsAsync", "Allow all the time"],
  "no runtime background permission request"
);

must(
  "src/features/fieldTrackingSetup/probe.ts",
  ["listMissingCriticalSteps", "foregroundGranted", "preciseOk"],
  "probe critical steps"
);

mustNot(
  "src/features/fieldTrackingSetup/probe.ts",
  ['missing.push("background")', 'missing.push("notifications")'],
  "background/notifications not critical"
);

must(
  "src/screens/FieldTrackingSetupScreen.tsx",
  [
    "Enable Location",
    "runForegroundLocationStep",
    "permanentlyDenied",
    "Open Settings",
    "Try Again",
    "Turn On Location",
    "PERMANENTLY_DENIED_MESSAGE"
  ],
  "simple setup screen"
);

mustNot(
  "src/screens/FieldTrackingSetupScreen.tsx",
  [
    "Allow Background Location",
    "Open Battery Settings",
    "Open Location Settings",
    "runBackgroundLocationStep",
    "Allow all the time"
  ],
  "no multi-step background/battery flow"
);

must(
  "src/features/fieldTrackingSetup/locationPermissionService.ts",
  [
    "probeLocationReadiness",
    "ensureLocationReadyForWorkday",
    "ensureLocationReadyForVisit",
    "requestForegroundLocation",
    "readyForWorkday = servicesEnabled && probe.foregroundGranted && probe.preciseOk"
  ],
  "workday readiness is foreground-only"
);

must(
  "src/features/fieldTrackingSetup/locationStates.ts",
  [
    "Location permission is disabled. Enable it from app settings to use field tracking.",
    'action: "open_app_settings"'
  ],
  "permanently denied copy + explicit settings action"
);

// Expo / Android config — no background location
mustNot(
  "app.config.js",
  ["ACCESS_BACKGROUND_LOCATION", "isAndroidBackgroundLocationEnabled: true", "FOREGROUND_SERVICE_LOCATION"],
  "release config drops background location"
);

must(
  "app.config.js",
  ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "isAndroidBackgroundLocationEnabled: false"],
  "foreground location declared"
);

mustNot(
  "android/app/src/main/AndroidManifest.xml",
  ["ACCESS_BACKGROUND_LOCATION", "FOREGROUND_SERVICE_LOCATION"],
  "manifest drops background location"
);

must(
  "android/app/src/main/AndroidManifest.xml",
  ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
  "manifest keeps fine/coarse"
);

// Repo-wide: no runtime background permission request
const repoTs = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "android") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) repoTs.push(full);
  }
}
walk(path.join(root, "src"));
walk(path.join(root, "mobile"));
walk(path.join(root, "scripts"));

for (const file of repoTs) {
  const src = fs.readFileSync(file, "utf8");
  if (src.includes("requestBackgroundPermissionsAsync")) {
    // Allow only documentation / mustNot strings in tests that assert absence.
    if (file.includes("test-field-tracking-setup") || file.includes("test-map-permission") || file.includes("test-foreground-location")) {
      continue;
    }
    assert.fail(`unexpected requestBackgroundPermissionsAsync in ${path.relative(root, file)}`);
  }
}

// Surfaces must not request OS permission dialogs directly
const noRequestSurfaces = [
  "mobile/app/visit/create-step4-review.tsx",
  "mobile/app/visit/create-step1.tsx",
  "mobile/lib/visit/visitGpsCapture.ts",
  "mobile/lib/visit/visitSubmitCoordinator.ts",
  "src/utils/locationRequiredModal.ts",
  "src/utils/location.ts",
  "src/utils/workdayLocationGate.ts",
  "src/features/duty/store/DutyContext.tsx"
];

for (const file of noRequestSurfaces) {
  mustNot(
    file,
    ["requestForegroundPermissionsAsync", "requestBackgroundPermissionsAsync"],
    `no OS request — ${file}`
  );
}

must(
  "src/navigation/RootNavigator.tsx",
  ["FieldTrackingSetup", "FieldTrackingSetupScreen"],
  "nav registration"
);

mustNot(
  "App.tsx",
  ["requestForegroundPermissionsAsync", "requestBackgroundPermissionsAsync", "FieldTrackingSetup"],
  "no splash permission spam"
);

console.log("Field tracking foreground-only setup checks passed.");
process.exit(0);
