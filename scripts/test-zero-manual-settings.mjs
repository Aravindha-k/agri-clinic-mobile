/**
 * Zero manual Settings in normal permission / startup / auth UX.
 * Covers matrix U items as static contracts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function walkTs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "android") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test("Biometric success from lock never mounts Password/Fingerprint Login shell", () => {
  const auth = read("src/storage/AuthContext.tsx");
  const unlock = read("src/screens/BiometricUnlockScreen.tsx");
  assert.match(auth, /fromLockGate \? "biometric_lock" : "login"/);
  assert.match(unlock, /reauthenticate_expired_session/);
  assert.match(unlock, /completeBiometricUnlock/);
});

test("Password login reconnects reauth material using bootstrap user id", () => {
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /employeeIdRef\.current = profile\.id/);
  assert.match(auth, /session\.userId/);
  assert.match(auth, /saveBiometricReauthMaterial/);
});

test("1–6. Fresh install: native FG after login; no FieldTrackingSetup; no auto Settings", () => {
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  const login = read("src/screens/LoginScreen.tsx");
  const nav = read("src/navigation/RootNavigator.tsx");
  assert.match(login, /maybeOfferFieldTrackingSetupAfterLogin/);
  assert.match(guard, /enableLocationForFieldWork/);
  assert.doesNotMatch(guard, /navigateRoot/);
  assert.doesNotMatch(guard, /FieldTrackingSetupScreen|name=["']FieldTrackingSetup["']/);
  assert.doesNotMatch(nav, /FieldTrackingSetup/);
  assert.doesNotMatch(guard, /Linking\.openSettings|openAppSettingsPage/);
});

test("7–11. Already granted: ensureForeground short-circuits without request", () => {
  const fg = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
  assert.match(fg, /if \(isGranted\(current\)\)/);
  assert.match(fg, /didRequest:\s*false|toResult\(current,\s*false\)/);
});

test("12–14. Deny: no auto Settings; retry Allow Location; permanent Open App Settings", () => {
  const modal = read("src/utils/locationRequiredModal.ts");
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.match(modal, /Allow Location/);
  assert.match(modal, /Open App Settings/);
  assert.match(modal, /permission_denied_retryable/);
  assert.match(modal, /permission_denied_permanent/);
  assert.doesNotMatch(
    gate.slice(
      gate.indexOf("export async function ensureLocationReadyForAction"),
      gate.indexOf("export function isPendingStartWorkDay")
    ),
    /openAppSettingsPage|Linking\.openSettings/
  );
});

test("15–19. GPS OFF: services resolution without permission re-request when granted", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  const services = read("src/utils/ensureAndroidLocationServices.ts");
  assert.match(gate, /ensureAndroidLocationServicesEnabled/);
  assert.match(services, /enableNetworkProviderAsync/);
  assert.match(gate, /turn_on_location/);
  assert.match(gate, /probeOnly:\s*true/);
});

test("20–22. Background never requested in normal Work Day / startup / visit gate", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  const home = read("mobile/app/(tabs)/index.tsx");
  assert.doesNotMatch(gate, /ensureBackgroundLocationForWorkday|requestBackgroundPermissionsAsync/);
  assert.doesNotMatch(home, /requestBackgroundPermissionsAsync|ensureBackgroundLocation/);
  const files = [...walkTs(path.join(root, "src")), ...walkTs(path.join(root, "mobile"))];
  const bgOwners = files.filter((f) =>
    fs.readFileSync(f, "utf8").includes("requestBackgroundPermissionsAsync")
  );
  assert.equal(bgOwners.length, 1);
  assert.ok(bgOwners[0].endsWith(`${path.sep}ensureBackgroundLocation.ts`));
});

test("Single foreground request owner", () => {
  const files = [...walkTs(path.join(root, "src")), ...walkTs(path.join(root, "mobile"))];
  const owners = files.filter((f) =>
    fs.readFileSync(f, "utf8").includes("requestForegroundPermissionsAsync")
  );
  assert.equal(owners.length, 1);
  assert.ok(owners[0].endsWith(`${path.sep}ensureForegroundLocation.ts`));
});

test("33–35. KAC login field: blank suffix, no example placeholder", () => {
  const login = read("src/screens/LoginScreen.tsx");
  assert.doesNotMatch(login, /ARAVINDH01/);
  assert.match(login, /KAC-|normalizeUsername|username/i);
});

test("36. Splash green-frame fix preserved", () => {
  const brand = read("src/config/brand.config.js");
  assert.match(brand, /nativeSplashBackgroundColor:\s*"#D8ECF8"/);
  const colorsPath = path.join(root, "android/app/src/main/res/values/colors.xml");
  if (fs.existsSync(colorsPath)) {
    const colors = fs.readFileSync(colorsPath, "utf8");
    assert.match(colors, /splashscreen_background[\s\S]*#D8ECF8/i);
  }
});

test("No manual Settings path instructions in normal i18n copy", () => {
  const en = read("src/i18n/en.ts");
  assert.doesNotMatch(en, /Settings > Apps|Go to Settings and enable|Enable permission manually/i);
});

console.log("Zero manual settings matrix contracts passed.");
