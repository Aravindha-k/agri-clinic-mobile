/**
 * Canonical one-tap location readiness + Start Work Day gate contracts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

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

const gate = "src/features/fieldTrackingSetup/locationReadinessGate.ts";
const home = "mobile/app/(tabs)/index.tsx";
const modal = "src/utils/locationRequiredModal.ts";
const ensure = "src/features/fieldTrackingSetup/ensureForegroundLocation.ts";
const duty = "src/features/duty/store/DutyContext.tsx";

// 1. Canonical gate exists with required result statuses
must(
  gate,
  [
    "ensureLocationReadyForAction",
    "startWorkDayWithLocationGate",
    '| "ready"',
    "permission_denied_retryable",
    "permission_denied_permanent",
    "services_disabled",
    "cancelled",
    "LOCATION_GATE_MESSAGES",
    "Location permission is required to start your workday.",
    "Location permission is disabled for Kavya Agri Clinic.",
    "Turn on device location to start your workday.",
    "Location was not enabled. Try again.",
    "Could not check location. Please try again.",
    "readinessInFlight",
    "pendingStartWorkDay",
    "openSettingsForPendingStartWorkDay",
    "clearPendingStartWorkDay",
    "probeOnly"
  ],
  "canonical location readiness gate"
);

// 2. Gate uses live OS reads + foreground request via ensureForegroundLocation
must(
  gate,
  [
    "ensureForegroundLocationPermission",
    "ensureAndroidLocationServicesEnabled",
    "getForegroundPermissionsAsync",
    "hasServicesEnabledAsync",
    "AppState"
  ],
  "gate owns permission + GPS + AppState"
);

mustNot(
  gate,
  ["requestBackgroundPermissionsAsync", "ensureBackgroundLocationForWorkday"],
  "normal readiness gate never requests background location"
);

// 3. Settings never open automatically inside the readiness sequence
const gateSrc = read(gate);
const ensureFn = gateSrc.slice(
  gateSrc.indexOf("export async function ensureLocationReadyForAction"),
  gateSrc.indexOf("export function isPendingStartWorkDay")
);
assert.ok(!ensureFn.includes("openAppSettingsPage"), "ensureLocationReadyForAction must not open Settings");
assert.ok(!ensureFn.includes("Linking.openSettings"), "ensureLocationReadyForAction must not open Settings");
assert.ok(!ensureFn.includes("openSettings("), "ensureLocationReadyForAction must not open Settings");

// openSettingsForPendingStartWorkDay is the only Settings path — after explicit tap
must(gate, ["export async function openSettingsForPendingStartWorkDay"], "explicit settings entry");
assert.match(gateSrc, /openSettingsForPendingStartWorkDay[\s\S]*openAppSettingsPage/);

// 4. Today Start Work Day uses one-tap gate — no Field Tracking Setup redirect
must(
  home,
  [
    "startWorkDayWithLocationGate",
    "openSettingsForPendingStartWorkDay",
    "startInFlightRef",
    'case "open_settings"',
    'case "try_again"',
    't("workdayUx.checkingLocation")',
    't("workdayUx.allowLocation")',
    't("workdayUx.turnOnDeviceLocation")',
    't("workdayUx.startingWorkday")',
    't("workdayUx.tryAgain")',
    't("workdayUx.openSettings")'
  ],
  "Today one-tap Start Work Day"
);

mustNot(
  home,
  [
    "ensureFieldTrackingReadyForWorkday",
    "showFieldTrackingNeedsAttentionAlert",
    "FieldTrackingSetup"
  ],
  "no setup redirect on Start Work Day"
);

// 5. Duty start: silent probe only, no Alert / Setup
must(duty, ["probeOnly: true", "ensureLocationReadyForAction", "clearPendingStartWorkDay"], "duty silent probe + clear pending");
mustNot(duty, ["promptFixLocationAccess", "ensureLocationReadyForWorkday"], "duty no Alert redirect");

// 6. Field GPS helpers route through canonical gate
must(modal, ["ensureLocationReadyForAction", "openSettingsForPendingStartWorkDay"], "modal uses gate");
mustNot(modal, ["promptFixLocationAccess", "ensureLocationReadyForWorkday"], "modal no setup Alert path");

// 7. Single requestForegroundPermissionsAsync owner remains ensureForegroundLocation
must(ensure, ["requestForegroundPermissionsAsync"], "permission request owner");
const repoFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "android") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) repoFiles.push(full);
  }
}
walk(path.join(root, "src"));
walk(path.join(root, "mobile"));

const requestOwners = repoFiles.filter((file) => {
  const src = fs.readFileSync(file, "utf8");
  return src.includes("requestForegroundPermissionsAsync");
});
assert.equal(
  requestOwners.length,
  1,
  `requestForegroundPermissionsAsync must live in exactly one TS file, found:\n${requestOwners
    .map((f) => path.relative(root, f))
    .join("\n")}`
);
assert.ok(
  requestOwners[0].endsWith(`${path.sep}ensureForegroundLocation.ts`),
  "only ensureForegroundLocation may call requestForegroundPermissionsAsync"
);

// 8. Background permission OS request lives only in ensureBackgroundLocation
const bgOwners = repoFiles.filter((file) => {
  const src = fs.readFileSync(file, "utf8");
  return src.includes("requestBackgroundPermissionsAsync");
});
assert.equal(
  bgOwners.length,
  1,
  `requestBackgroundPermissionsAsync must live in exactly one TS file, found:\n${bgOwners
    .map((f) => path.relative(root, f))
    .join("\n")}`
);
assert.ok(
  bgOwners[0].endsWith(`${path.sep}ensureBackgroundLocation.ts`),
  "only ensureBackgroundLocation may call requestBackgroundPermissionsAsync"
);

// 9. BottomNav / Visit FAB use one-tap gate
must("src/components/ui/BottomNav.tsx", ["startWorkDayWithLocationGate"], "BottomNav gate");
must("src/components/ui/VisitFabTabButton.tsx", ["startWorkDayWithLocationGate"], "Visit FAB gate");

// 10. Exports from package index
must(
  "src/features/fieldTrackingSetup/index.ts",
  ["ensureLocationReadyForAction", "startWorkDayWithLocationGate", "openSettingsForPendingStartWorkDay"],
  "package exports"
);

// 11. Stale persisted permission flags must not drive the OS dialog decision
mustNot(
  gate,
  [
    "locationPermissionDenied",
    "hasRequestedPermission",
    "permissionSetupCompleted",
    "locationOnboardingComplete",
    "cachedPermissionStatus"
  ],
  "no stale permission flags in gate"
);

// 12. AppState resume uses probeOnly (no auto dialogs)
assert.match(read(gate), /handleAppStateChange[\s\S]*probeOnly:\s*true/);

must(
  "src/i18n/en.ts",
  [
    'checkingLocation: "Checking Location…"',
    'allowLocation: "Allow Location"',
    'turnOnDeviceLocation: "Turn On Location"',
    'startingWorkday: "Starting Work Day…"',
    'permissionBody: "Location permission is required to start your workday."',
    'permissionBlockedBody: "Location permission is disabled for Kavya Agri Clinic."',
    'locationNotEnabled: "Location was not enabled. Try again."'
  ],
  "professional Start Work Day copy"
);

// 13. Session / logout clears pending start
must(duty, ['phase === "session_replaced"', "clearPendingStartWorkDay"], "session clear pending");

console.log("PASS location-readiness-gate (one-tap Start Work Day)");

