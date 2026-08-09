/**
 * Permission / biometric behavior without new onboarding screens.
 * Ensures OS permission is only requested when not granted; biometric uses existing flow.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("no DeviceSetup wizard / gate screens exist", () => {
  assert.equal(fs.existsSync(path.join(root, "src/screens/DeviceSetupScreen.tsx")), false);
  assert.equal(fs.existsSync(path.join(root, "src/features/deviceSetup")), false);
  const nav = read("src/navigation/RootNavigator.tsx");
  assert.doesNotMatch(nav, /DeviceSetup/);
  assert.match(nav, /Enter Today immediately/);
});

test("shared silent permission snapshot helper exists", () => {
  const snap = read("src/features/fieldTrackingSetup/locationPermissionSnapshot.ts");
  assert.match(snap, /getLocationPermissionSnapshot/);
  assert.match(snap, /hasServicesEnabledAsync/);
  assert.doesNotMatch(snap, /requestForegroundPermissionsAsync/);
  assert.doesNotMatch(snap, /requestBackgroundPermissionsAsync/);
});

test("shouldOfferFieldTrackingSetup is silent when OS already granted", () => {
  const probe = read("src/features/fieldTrackingSetup/probe.ts");
  assert.match(probe, /health\.ready/);
  assert.match(probe, /markFieldTrackingSetupCompleted/);
  assert.match(probe, /return false/);
  assert.match(probe, /never offer when already granted|OS permission is source of truth|Permission already granted/i);
});

test("ensureForeground does not request when already granted", () => {
  const src = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
  assert.match(src, /getForegroundPermissionsAsync/);
  assert.match(src, /if \(isGranted\(current\)\)/);
  assert.match(src, /didRequest:\s*false/);
  assert.match(src, /requestForegroundPermissionsAsync/);
});

test("only ensureForeground/Background own OS request calls", () => {
  const offenders = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (
        rel.includes("ensureForegroundLocation.ts") ||
        rel.includes("ensureBackgroundLocation.ts")
      ) {
        continue;
      }
      const src = fs.readFileSync(full, "utf8");
      if (/requestForegroundPermissionsAsync|requestBackgroundPermissionsAsync/.test(src)) {
        offenders.push(rel);
      }
    }
  }
  walk(path.join(root, "src"));
  walk(path.join(root, "mobile"));
  assert.deepEqual(offenders, [], `Unexpected request owners: ${offenders.join(", ")}`);
});

test("Start Work Day uses probeOnly in DutyContext; interactive gate is readiness gate", () => {
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /probeOnly:\s*true/);
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.match(gate, /ensureLocationReadyForAction/);
  assert.match(gate, /probeOnly/);
});

test("existing biometric enrollment + unlock preserved on Login", () => {
  const login = read("src/screens/LoginScreen.tsx");
  assert.match(login, /shouldOfferBiometricEnrollment/);
  assert.match(login, /offerBiometricEnrollmentIfNeeded/);
  assert.match(login, /maybeOfferFieldTrackingSetupAfterLogin/);
  const bio = read("src/storage/biometricLoginStorage.ts");
  assert.match(bio, /shouldOfferBiometricEnrollment/);
  assert.match(bio, /status\.enabled \|\| dismissed/);
});

test("logout remains mobile/auth/logout/; refresh SESSION_REPLACED teardown intact", () => {
  assert.match(read("src/api/auth.ts"), /mobile\/auth\/logout\//);
  assert.match(read("src/api/tokenRefresh.ts"), /handleDeviceSessionConflict/);
  assert.match(read("src/api/tokenRefresh.ts"), /device_session_id/);
});

test("FieldTrackingSetup screen remains the existing recovery UI", () => {
  assert.ok(fs.existsSync(path.join(root, "src/screens/FieldTrackingSetupScreen.tsx")));
  const nav = read("src/navigation/RootNavigator.tsx");
  assert.match(nav, /FieldTrackingSetup/);
  assert.match(nav, /FieldTrackingSetupScreen/);
});
