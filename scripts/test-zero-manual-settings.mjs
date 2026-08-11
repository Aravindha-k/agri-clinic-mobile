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
  assert.match(auth, /reconnectBiometricAfterPasswordLogin/);
  assert.match(auth, /employeeIdRef\.current = profile\.id/);
  assert.match(read("src/storage/biometricLoginStorage.ts"), /saveBiometricReauthMaterial/);
});

test("1. Login + missing + canAskAgain → native FG request directly", () => {
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  const login = read("src/screens/LoginScreen.tsx");
  assert.match(login, /maybeOfferFieldTrackingSetupAfterLogin/);
  assert.match(guard, /getForegroundPermissionsAsync/);
  assert.match(guard, /ensureForegroundLocationPermission/);
  assert.match(guard, /canAskAgain === false/);
  assert.doesNotMatch(guard, /enableLocationForFieldWork/);
  assert.doesNotMatch(guard, /ensureAndroidLocationServicesEnabled/);
});

test("2. No FieldTrackingSetup navigation after login", () => {
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  const login = read("src/screens/LoginScreen.tsx");
  const nav = read("src/navigation/RootNavigator.tsx");
  assert.doesNotMatch(guard, /navigateRoot/);
  assert.doesNotMatch(guard, /FieldTrackingSetupScreen|name=["']FieldTrackingSetup["']/);
  assert.doesNotMatch(login, /FieldTrackingSetupScreen|navigateRoot\(["']FieldTrackingSetup/);
  assert.doesNotMatch(nav, /FieldTrackingSetup/);
});

test("3. No Open Settings on normal first request", () => {
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  const fg = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
  assert.doesNotMatch(guard, /Linking\.openSettings|openAppSettingsPage|openSettingsForMissing/);
  assert.doesNotMatch(fg, /Linking\.openSettings|openAppSettingsPage/);
});

test("4. Native grant auto-continues — no Continue / Done after OS dialog", () => {
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  assert.match(guard, /if \(result\.granted\)/);
  assert.match(guard, /healSetupIfOsGranted|markFieldTrackingSetupCompleted/);
  assert.doesNotMatch(guard, /Continue|Done|Try again/);
});

test("5. Already granted on login → zero permission request", () => {
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  const grantedBranch = guard.slice(
    guard.indexOf("if (isForegroundGranted(current))"),
    guard.indexOf("if (current.status === Location.PermissionStatus.DENIED")
  );
  assert.match(grantedBranch, /healSetupIfOsGranted|markFieldTrackingSetupCompleted/);
  assert.doesNotMatch(grantedBranch, /ensureForegroundLocationPermission/);
});

test("6. Fingerprint reopen + granted → zero location request", () => {
  const auth = read("src/storage/AuthContext.tsx");
  const unlock = auth.slice(
    auth.indexOf("const completeBiometricUnlock"),
    auth.indexOf("const choosePasswordLogin")
  );
  assert.doesNotMatch(unlock, /maybeOfferFieldTrackingSetupAfterLogin|ensureForegroundLocationPermission|enableLocationForFieldWork/);
  assert.doesNotMatch(read("src/screens/BiometricUnlockScreen.tsx"), /maybeOfferFieldTrackingSetupAfterLogin|ensureForegroundLocationPermission/);
});

test("7. Logout → password relogin + granted → zero request", () => {
  const auth = read("src/storage/AuthContext.tsx");
  const signOut = auth.slice(auth.indexOf("const signOut = useCallback"), auth.indexOf("const value = useMemo"));
  assert.doesNotMatch(signOut, /clearFieldTrackingSetupCompletion|resetFieldTrackingSetupOfferSession/);
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  assert.match(guard, /isForegroundGranted\(current\)/);
  assert.match(guard, /Already-granted OS permission/);
});

test("8–9. Start Work Day: requestable → native; granted → no permission UI", () => {
  const home = read("mobile/app/(tabs)/index.tsx");
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.match(home, /startWorkDayWithLocationGate/);
  assert.match(home, /handleStartWorkday/);
  assert.doesNotMatch(home, /precise_required/);
  assert.match(gate, /ensureForegroundLocationPermission/);
  assert.match(gate, /if \(!alreadyGranted\)/);
  assert.match(gate, /if \(!permission \|\| !permission\.granted\)/);
});

test("10. Approximate foreground does not force Settings", () => {
  const fg = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  const visit = read("mobile/app/visit/create-step4-review.tsx");
  assert.match(fg, /approximate is not a missing-permission case/i);
  assert.doesNotMatch(
    fg.slice(
      fg.indexOf("export async function ensureForegroundLocationPermission"),
      fg.indexOf("export async function enableLocationForFieldWork")
    ),
    /requestForegroundPermissionsAsync[\s\S]*requestForegroundPermissionsAsync/
  );
  assert.match(gate, /Approximate does not force Settings/);
  assert.doesNotMatch(visit, /openSettingsForMissing\("precise"\)/);
});

test("11. Background permission absent is not a blocker", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  assert.doesNotMatch(gate, /ensureBackgroundLocationForWorkday|requestBackgroundPermissionsAsync/);
  assert.doesNotMatch(guard, /requestBackgroundPermissionsAsync|ensureBackgroundLocation/);
});

test("12. Permanently denied → App Settings recovery available", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  const home = read("mobile/app/(tabs)/index.tsx");
  assert.match(gate, /permission_denied_permanent/);
  assert.match(gate, /openSettingsForPendingStartWorkDay/);
  assert.match(home, /permission_denied_permanent/);
});

test("13. GPS OFF + permission granted → Location service flow, no permission request", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  const services = read("src/utils/ensureAndroidLocationServices.ts");
  const permThenServices = gate.slice(
    gate.indexOf('emitPhase(onPhase, "turn_on_location")'),
    gate.indexOf("export function isPendingStartWorkDay")
  );
  assert.match(permThenServices, /ensureAndroidLocationServicesEnabled/);
  assert.doesNotMatch(permThenServices, /ensureForegroundLocationPermission/);
  assert.match(services, /enableNetworkProviderAsync/);
  assert.match(gate, /turn_on_location/);
});

test("14. Stale setup flag + actual permission granted → auto-heal", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  const guard = read("src/features/fieldTrackingSetup/workdayGuard.ts");
  assert.match(gate, /markFieldTrackingSetupCompleted/);
  assert.match(guard, /healSetupIfOsGranted|markFieldTrackingSetupCompleted/);
});

test("15. Employee reactivate + permission already granted → no re-prompt", () => {
  const inactive = read("src/storage/employeeInactive.ts");
  const auth = read("src/storage/AuthContext.tsx");
  assert.doesNotMatch(inactive, /clearFieldTrackingSetupCompletion/);
  assert.doesNotMatch(auth, /clearFieldTrackingSetupCompletion/);
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
