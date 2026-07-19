/**
 * Foreground location permission behaviour contracts (static + single-flight).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const ensure = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
const actions = read("src/features/fieldTrackingSetup/actions.ts");
const screen = read("src/screens/FieldTrackingSetupScreen.tsx");
const service = read("src/features/fieldTrackingSetup/locationPermissionService.ts");

// 1) Already granted → no request
assert.match(ensure, /if \(current\.status === "granted"\)/);
assert.match(ensure, /didRequest: false/);

// 2) First request when canAskAgain
assert.match(ensure, /requestForegroundPermissionsAsync/);
assert.match(ensure, /didRequest: true/);

// 3) Denied but can ask again → no settings
assert.match(ensure, /canAskAgain/);
assert.doesNotMatch(ensure, /Linking\.openSettings|openLocationPermissionSettings|APPLICATION_DETAILS/);

// 4) Permanently denied → no automatic settings; optional button on screen
assert.match(ensure, /permanentlyDenied: true/);
assert.match(screen, /permanentlyDenied \? \(/);
assert.match(screen, /Open Settings/);
assert.match(screen, /openSettingsForMissing\("foreground"\)/);

// 5) Single-flight
assert.match(ensure, /if \(permissionInFlight\)/);
assert.match(ensure, /if \(enableFlowInFlight\)/);

// 6) Restart / rehydrate uses getForegroundPermissionsAsync first
assert.match(ensure, /getForegroundPermissionsAsync/);
assert.match(service, /probeLocationReadiness/);

// 7) No background request anywhere in permission path
assert.doesNotMatch(ensure, /requestBackgroundPermissionsAsync/);
assert.doesNotMatch(actions, /requestBackgroundPermissionsAsync/);
assert.doesNotMatch(screen, /requestBackgroundPermissionsAsync/);

// GPS services after permission — user-gesture only via enable flow
assert.match(ensure, /ensureAndroidLocationServicesEnabled/);

console.log("Foreground location permission contract checks passed.");
process.exit(0);
