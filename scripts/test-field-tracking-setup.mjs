/**
 * Field Tracking setup — foreground at setup; background only at Start Work Day.
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
    "Location permission is disabled for Kavya Agri Clinic."
  ],
  "single-flight foreground permission service"
);

mustNot(
  "src/features/fieldTrackingSetup/ensureForegroundLocation.ts",
  ["requestBackgroundPermissionsAsync", "openSettings", "Linking.openSettings"],
  "no background request / auto settings in ensureForeground"
);

must(
  "src/features/fieldTrackingSetup/ensureBackgroundLocation.ts",
  [
    "ensureBackgroundLocationForWorkday",
    "requestBackgroundPermissionsAsync",
    "WORKDAY_LOCATION_DISCLOSURE",
    "Location is used during your active workday so the office can view your latest field location."
  ],
  "workday-scoped background permission with disclosure"
);

must(
  "src/features/fieldTrackingSetup/actions.ts",
  ["enableLocationForFieldWork", "ensureBackgroundLocationForWorkday", "openedSettings: false"],
  "actions use enable flow; background via workday helper"
);

must(
  "src/features/fieldTrackingSetup/probe.ts",
  ["listMissingCriticalSteps", "foregroundGranted", "preciseOk"],
  "probe critical steps"
);

mustNot(
  "src/features/fieldTrackingSetup/probe.ts",
  ['missing.push("background")', 'missing.push("notifications")'],
  "background/notifications not critical for setup screen"
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
  "no multi-step background/battery flow on setup screen"
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
  "workday readiness still requires foreground + precise"
);

must(
  "src/features/fieldTrackingSetup/locationStates.ts",
  [
    "Location permission is disabled for Kavya Agri Clinic.",
    'action: "open_app_settings"'
  ],
  "permanently denied copy + explicit settings action"
);

// Expo / Android config — FGS + background for active workday tracking
must(
  "app.config.js",
  [
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "ACCESS_BACKGROUND_LOCATION",
    "FOREGROUND_SERVICE_LOCATION",
    "isAndroidBackgroundLocationEnabled: true",
    "isAndroidForegroundServiceEnabled: true"
  ],
  "release config enables FGS + background location"
);

must(
  "android/app/src/main/AndroidManifest.xml",
  [
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "ACCESS_BACKGROUND_LOCATION",
    "FOREGROUND_SERVICE_LOCATION"
  ],
  "manifest declares FGS + background location"
);

// requestBackgroundPermissionsAsync only in ensureBackgroundLocation (+ tests)
const allowedBg = new Set([
  path.join(root, "src", "features", "fieldTrackingSetup", "ensureBackgroundLocation.ts")
]);
const repoTs = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "android") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js)$/.test(entry.name)) repoTs.push(full);
  }
}
walk(path.join(root, "src"));
walk(path.join(root, "mobile"));

for (const file of repoTs) {
  const src = fs.readFileSync(file, "utf8");
  if (src.includes("requestBackgroundPermissionsAsync") && !allowedBg.has(file)) {
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

must(
  "src/features/fieldTrackingSetup/locationReadinessGate.ts",
  ["ensureBackgroundLocationForWorkday"],
  "Start Work Day gate requests background after disclosure"
);

console.log("Field tracking setup + workday FGS permission checks passed.");
process.exit(0);
