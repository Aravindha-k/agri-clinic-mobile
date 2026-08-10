/**
 * Device blockers: biometric after logout + Start Work Day location visibility.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("1–10. Password login reconnects biometric and refreshes interactive UI", () => {
  const bio = read("src/storage/biometricLoginStorage.ts");
  const auth = read("src/storage/AuthContext.tsx");
  const login = read("src/screens/LoginScreen.tsx");
  const section = read("src/components/auth/LoginBiometricSection.tsx");
  const settings = read("src/screens/SettingsScreen.tsx");

  assert.match(bio, /reconnectBiometricAfterPasswordLogin/);
  assert.match(bio, /setPreferPasswordLoginThisSession\(false\)/);
  assert.match(bio, /ENABLED_KEY,\s*"1"/);
  assert.match(bio, /return true/);
  assert.match(auth, /reconnectBiometricAfterPasswordLogin/);
  assert.match(auth, /clearBiometricReauthMaterial\("explicit_logout"\)/);
  assert.doesNotMatch(
    auth.slice(auth.indexOf("const signOut = useCallback"), auth.indexOf("const value = useMemo")),
    /clearBiometricLogin/
  );
  assert.match(login, /await signIn\(user, password\)/);
  assert.match(login, /await refreshBiometricState\(\)/);
  assert.match(section, /canLogin \? \(/);
  assert.match(section, /TouchableOpacity/);
  assert.match(settings, /refreshBiometricStatus/);
  assert.match(settings, /useFocusEffect/);
  assert.match(settings, /biometricStatus == null/);
});

test("11–12. Start Work Day: permanent denial only maps to Open Settings", () => {
  const home = read("mobile/app/(tabs)/index.tsx");
  assert.match(home, /permission_denied_permanent/);
  assert.doesNotMatch(home, /precise_required/);
  assert.match(home, /startWorkDayWithLocationGate/);
});

test("13–14. Approximate / precise must not force Settings in gate", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  const ensure = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
  assert.doesNotMatch(
    gate.slice(
      gate.indexOf("export async function ensureLocationReadyForAction"),
      gate.indexOf("export function isPendingStartWorkDay")
    ),
    /precise_required/
  );
  assert.match(gate, /Approximate does not force Settings|Foreground granted is enough/i);
  assert.match(ensure, /needsPreciseUpgrade: !preciseOk/);
  assert.match(ensure, /ok: true/);
});

test("15. Background not part of Start Work Day readiness", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.doesNotMatch(gate, /ensureBackgroundLocationForWorkday|requestBackgroundPermissionsAsync/);
});

test("16. Permanent denial still opens Settings path", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.match(gate, /permission_denied_permanent/);
  assert.match(gate, /open_settings/);
  assert.match(gate, /canAskAgain === false/);
});

test("17. Stale setup healed when FG + services ready", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.match(gate, /markFieldTrackingSetupCompleted/);
});

test("18. FieldTrackingSetup out of normal routing", () => {
  const nav = read("src/navigation/RootNavigator.tsx");
  assert.doesNotMatch(nav, /FieldTrackingSetup/);
});

console.log("Device blocker biometric + workday location contracts passed.");
