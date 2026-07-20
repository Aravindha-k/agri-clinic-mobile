/**
 * Professional biometric auth: app-lock vs re-login, session_expired UX, secure material.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("AuthPhase includes session_expired and authenticating_password", () => {
  const src = read("src/storage/authPhase.ts");
  assert.match(src, /"session_expired"/);
  assert.match(src, /"authenticating_password"/);
  assert.match(src, /isSessionExpiredPhase/);
  assert.match(src, /isBiometricLockPhase/);
});

test("biometric distinguishes app-lock vs re-login actions", () => {
  const src = read("src/storage/biometricLoginStorage.ts");
  assert.match(src, /BiometricAction/);
  assert.match(src, /unlock_existing_session/);
  assert.match(src, /reauthenticate_expired_session/);
  assert.match(src, /resolveBiometricAction/);
  assert.match(src, /loginRequest/);
  assert.match(src, /refreshAccessTokenOnce/);
  assert.match(src, /agri_bio_v2_secret/);
  assert.match(src, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.match(src, /biometricActionInFlight/);
  assert.doesNotMatch(src, /AsyncStorage/);
});

test("legacy password keys are never written", () => {
  const src = read("src/storage/biometricLoginStorage.ts");
  for (const key of [
    "biometric_login_pass",
    "biometric_login_user",
    "biometric_reauth_username",
    "biometric_reauth_password"
  ]) {
    assert.doesNotMatch(src, new RegExp(`setItemAsync\\([^)]*${key}`));
  }
  assert.match(src, /deleteItemAsync\(LEGACY_PASS_KEY\)/);
});

test("session expiry keeps biometric and uses session_expired phase", () => {
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /phase: "session_expired"/);
  assert.match(auth, /forceSessionExpiredLogout/);
  assert.doesNotMatch(
    auth.slice(auth.indexOf("forceSessionExpiredLogout"), auth.indexOf("forceSessionExpiredLogout") + 500),
    /clearBiometricLogin/
  );
});

test("explicit logout clears biometric material", () => {
  const auth = read("src/storage/AuthContext.tsx");
  const signOut = auth.slice(auth.indexOf("const signOut = useCallback"), auth.indexOf("const value = useMemo"));
  assert.match(signOut, /clearBiometricLogin/);
  assert.match(signOut, /explicit_logout/);
});

test("session replaced clears biometric", () => {
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /forceSessionConflictLogout/);
  const conflict = auth.slice(
    auth.indexOf("forceSessionConflictLogout"),
    auth.indexOf("forceSessionExpiredLogout")
  );
  assert.match(conflict, /clearBiometricLogin/);
});

test("Login shows fingerprint + password on session expiry", () => {
  const login = read("src/screens/LoginScreen.tsx");
  const section = read("src/components/auth/LoginBiometricSection.tsx");
  assert.match(login, /sessionExpired/);
  assert.match(login, /sessionExpiredTitle/);
  assert.match(login, /signInWithPassword/);
  assert.match(section, /Unlock with Fingerprint/);
  assert.match(section, /sessionExpired/);
});

test("password login refreshes Keystore reauth material when biometric enabled", () => {
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /saveBiometricReauthMaterial/);
  assert.match(auth, /biometric_reconnected/);
});

test("no secret fields in biometric logs", () => {
  const bio = read("src/storage/biometricLoginStorage.ts");
  const logCalls = [...bio.matchAll(/logBiometric\(([^;]+)\)/g)].map((m) => m[1]);
  for (const call of logCalls) {
    assert.ok(!/\bpassword\s*:/.test(call), `must not log password: ${call.slice(0, 80)}`);
    assert.ok(!/\bsecret\s*:/.test(call), `must not log secret: ${call.slice(0, 80)}`);
  }
});

console.log("PASS biometric-session-flow");
