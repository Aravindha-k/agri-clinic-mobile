/**
 * Foreground location permission behaviour contracts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const ensure = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
const actions = read("src/features/fieldTrackingSetup/actions.ts");
const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
const modal = read("src/utils/locationRequiredModal.ts");

// Live OS read — never trust persisted permanentlyDenied / setup flags for the dialog.
assert.match(ensure, /getForegroundPermissionsAsync/);
assert.match(ensure, /requestForegroundPermissionsAsync/);
assert.match(ensure, /hasServicesEnabledAsync/);
assert.doesNotMatch(ensure, /AsyncStorage|field_tracking_setup|syncFieldTrackingPermissionSnapshot/);

// Permanently denied ONLY when status denied AND canAskAgain === false
assert.match(ensure, /status === "denied" && response\.canAskAgain === false/);
assert.match(ensure, /isPermanentlyDenied/);

// Granted uses .granted
assert.match(ensure, /response\.granted === true/);

// Normal denial must request dialog (not Settings)
assert.match(ensure, /requestForegroundPermissionsAsync/);
assert.match(ensure, /RETRY_PERMISSION_MESSAGE/);
assert.doesNotMatch(ensure, /Linking\.openSettings|APPLICATION_DETAILS|openLocationPermissionSettings/);

// Approximate grant is reused — no automatic precise upgrade request
assert.match(ensure, /preciseOk/);
assert.match(ensure, /accuracy === "coarse"/);
assert.match(ensure, /approximate is not a missing-permission case/i);

// Gate: Settings phase only for permanent denial recovery
assert.match(gate, /permission_denied_permanent/);
assert.doesNotMatch(
  gate.slice(
    gate.indexOf("export async function ensureLocationReadyForAction"),
    gate.indexOf("export function isPendingStartWorkDay")
  ),
  /precise_required/
);
assert.match(modal, /Allow Location/);
assert.match(modal, /Open App Settings/);
assert.doesNotMatch(modal, /await openSettingsForPendingStartWorkDay\(async \(\) => undefined\);\s*\}\s*if \(result\.permanentlyDenied\)/);

// Never fall back to Settings message for every !ok
assert.match(actions, /RETRY_PERMISSION_MESSAGE/);
assert.doesNotMatch(
  actions,
  /message: result\.message \?\? PERMANENTLY_DENIED_MESSAGE/
);

// Single-flight
assert.match(ensure, /if \(permissionInFlight\)/);
assert.match(ensure, /if \(enableFlowInFlight\)/);

// No background request
assert.doesNotMatch(ensure, /requestBackgroundPermissionsAsync/);
assert.doesNotMatch(actions, /requestBackgroundPermissionsAsync/);

console.log("Foreground location permission contract checks passed.");
process.exit(0);
