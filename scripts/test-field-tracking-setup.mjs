/**
 * Field Tracking — foreground at field actions; background dormant in normal flow.
 * Custom Enable Location screen is not registered in normal navigation.
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
    "Location permission is disabled for Kavya Agri Clinic.",
    "preciseOk"
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
    "WORKDAY_LOCATION_DISCLOSURE"
  ],
  "dormant background helper retained for compatibility"
);

must(
  "src/features/fieldTrackingSetup/actions.ts",
  ["enableLocationForFieldWork", "ensureBackgroundLocationForWorkday", "openedSettings: false"],
  "actions use enable flow; background helper remains available"
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

// Legacy setup screen may remain on disk but must not be navigable.
mustNot(
  "src/navigation/RootNavigator.tsx",
  ["FieldTrackingSetup", "FieldTrackingSetupScreen"],
  "FieldTrackingSetup removed from normal navigation"
);

mustNot("src/navigation/types.ts", ["FieldTrackingSetup"], "no FieldTrackingSetup route type");

must(
  "src/features/fieldTrackingSetup/locationPermissionService.ts",
  [
    "probeLocationReadiness",
    "ensureLocationReadyForWorkday",
    "ensureLocationReadyForVisit",
    "requestForegroundLocation",
    "readyForWorkday = servicesEnabled && probe.foregroundGranted"
  ],
  "workday readiness still requires foreground + precise"
);

must(
  "src/features/fieldTrackingSetup/locationStates.ts",
  [
    "Location permission is disabled for Kavya Agri Clinic.",
    'action: "open_app_settings"',
    'primary: { label: "Allow Location", action: "allow_location" }'
  ],
  "permanently denied copy + precise uses Allow Location first"
);

// Expo / Android config — FGS + background declared; runtime BG request is dormant
must(
  "app.config.js",
  [
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "ACCESS_BACKGROUND_LOCATION",
    "FOREGROUND_SERVICE_LOCATION",
    "isAndroidForegroundServiceEnabled: true"
  ],
  "release config enables FGS"
);

must(
  "android/app/src/main/AndroidManifest.xml",
  [
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "FOREGROUND_SERVICE_LOCATION"
  ],
  "manifest declares FGS + location"
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

mustNot(
  "App.tsx",
  ["requestForegroundPermissionsAsync", "requestBackgroundPermissionsAsync", "FieldTrackingSetup"],
  "no splash permission spam"
);

mustNot(
  "src/features/fieldTrackingSetup/locationReadinessGate.ts",
  ["ensureBackgroundLocationForWorkday", "requestBackgroundPermissionsAsync"],
  "Start Work Day gate never requests background location"
);

must(
  "src/features/fieldTrackingSetup/workdayGuard.ts",
  ["ensureForegroundLocationPermission", "getForegroundPermissionsAsync"],
  "post-login probes then requests native FG only when missing"
);

mustNot(
  "src/features/fieldTrackingSetup/workdayGuard.ts",
  ["navigateRoot", 'name="FieldTrackingSetup"', "FieldTrackingSetupScreen"],
  "post-login never navigates to setup screen"
);

console.log("Field tracking setup + workday FGS permission checks passed.");
process.exit(0);
