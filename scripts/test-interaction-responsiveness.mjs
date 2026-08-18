/**
 * Interaction responsiveness — Start Work Day, login, GPS reuse, permissions.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

test("Start Work Day releases Today UI without awaiting post-success bootstrap", () => {
  const home = read("mobile/app/(tabs)/index.tsx");
  assert.match(home, /setStarting\(false\);\s*continueAfterDutyStarted\(\)/s);
  assert.doesNotMatch(home, /await continueAfterDutyStarted\(\)/);
  assert.match(home, /loadAll\(false, \{ silent: true \}\)/);
  assert.doesNotMatch(
    home.slice(home.indexOf("async function continueAfterDutyStarted"), home.indexOf("async function handleStartWorkday")),
    /loadAll\(true\)/
  );
});

test("applyDutyState paints React state before SecureStore/AsyncStorage persist", () => {
  const duty = read("src/features/duty/store/DutyContext.tsx");
  const apply = duty.slice(
    duty.indexOf("const applyDutyState = useCallback"),
    duty.indexOf("const clearDutyState")
  );
  const persistIdx = apply.indexOf("void saveDutySessionFromWorkday");
  const stateIdx = apply.indexOf("setState((prev) => ({");
  assert.ok(persistIdx >= 0 && stateIdx > persistIdx, "persist is fire-and-forget then setState");
  assert.match(apply, /void writeCachedDutyBootstrap/);
});

test("startDuty skips a duplicate probe when the gate just succeeded; one start POST", () => {
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /wasLocationReadyRecently\(\)/);
  assert.match(duty, /probeOnly:\s*true/);
  const start = duty.slice(duty.indexOf("const startDuty = useCallback"), duty.indexOf("const endDuty"));
  assert.equal(start.split("startDutySession").length - 1, 1);
});

test("GPS hang timeout falls back to last-known; tracking reuses a fresh start fix", () => {
  const location = read("src/utils/location.ts");
  assert.match(location, /readForegroundLocationIfGrantedWithTimeout/);
  assert.match(location, /getLastKnownPositionAsync/);
  assert.match(location, /rememberFreshLocation/);

  const tracking = read("src/storage/TrackingContext.tsx");
  assert.match(tracking, /peekFreshLocation\(TRACKING_LOCATION_REUSE_MS\)/);
  assert.match(tracking, /if \(!reusedStartFix\)/);
  assert.match(tracking, /void pollOnce\(\);/);
  assert.doesNotMatch(tracking, /await pollOnce\(\);/);
});

test("already-granted Start Work Day does not re-read permission after a dialog-less grant", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.match(gate, /permission\.didRequest/);
  assert.match(gate, /void import\("\.\/persistence"\)/);
  assert.match(gate, /markLocationReadyNow\(\)/);
});

test("password login releases spinner after signIn; post-login prep is background", () => {
  const login = read("src/screens/LoginScreen.tsx");
  const handle = login.slice(login.indexOf("async function handleLogin"), login.indexOf("async function handleBiometricLogin"));
  const signInIdx = handle.indexOf("await signIn(user, password)");
  const releaseIdx = handle.indexOf("setLoading(false)");
  const bioIdx = handle.indexOf("void refreshBiometricState()");
  const setupIdx = handle.indexOf("maybeOfferFieldTrackingSetupAfterLogin");
  assert.ok(signInIdx >= 0 && releaseIdx > signInIdx, "spinner clears after auth success");
  assert.ok(bioIdx > releaseIdx, "biometric refresh is after spinner release");
  assert.ok(setupIdx > releaseIdx, "location offer is after spinner release");
  assert.doesNotMatch(handle, /await maybeOfferFieldTrackingSetupAfterLogin/);
  assert.doesNotMatch(handle, /await offerBiometricEnrollmentIfNeeded/);
});

test("visit submit reuses a fresh review GPS instead of a second High-accuracy fix", () => {
  const coord = read("mobile/lib/visit/visitSubmitCoordinator.ts");
  assert.match(coord, /peekFreshLocation\(VISIT_LOCATION_REUSE_MS\)/);
  assert.match(coord, /reuseVisitGps/);
  assert.match(coord, /void refreshCurrentDuty\(\)/);
});

test("freshness helper never stores invalid coordinates", () => {
  const src = read("src/utils/locationFreshness.ts");
  assert.match(src, /hasValidMapCoords/);
  assert.match(src, /TRACKING_LOCATION_REUSE_MS = 20_000/);
  assert.doesNotMatch(src, /password|refresh_token|Authorization/);
});
