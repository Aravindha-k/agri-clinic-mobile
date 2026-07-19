/**
 * Static regression tests for biometric auth state machine, SecureStore migration,
 * and tracking auth gates (A–J from the biometric race fix brief).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustInclude(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(src.includes(needle), `${label}: missing "${needle}" in ${file}`);
  }
}

function mustNotInclude(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(!src.includes(needle), `${label}: unexpected "${needle}" in ${file}`);
  }
}

// A/B/C — auth phase machine + lock ≠ logout
mustInclude(
  "src/storage/authPhase.ts",
  [
    '"initializing"',
    '"locked"',
    '"authenticating_biometric"',
    '"validating_session"',
    '"authenticated"',
    '"unauthenticated"',
    "canSendAuthenticatedRequests",
    "canEnterAppShell"
  ],
  "A authPhase"
);

mustInclude(
  "src/storage/AuthContext.tsx",
  [
    "session_locked",
    "lockSessionForBiometric",
    "choosePasswordLogin",
    "attemptBiometricUnlock",
    "foregroundBootstrapPromise",
    "applyPhase(\"locked\"",
    'reason: "explicit_logout"',
    "network_error"
  ],
  "A AuthContext lock"
);

mustNotInclude(
  "src/storage/AuthContext.tsx",
  ["sign_out_biometric_lock"],
  "explicit logout must clear session (not soft-lock)"
);

mustNotInclude(
  "src/storage/AuthContext.tsx",
  ['session_cleared", "biometric unlock required'],
  "B no token clear on biometric lock"
);

// C — cancel must not clear enabled flag
mustInclude(
  "src/storage/biometricLoginStorage.ts",
  [
    "BiometricUnlockOutcome",
    "user_cancel",
    "authentication_failed",
    "clearBiometricCredentialMaterial",
    "prompt_result"
  ],
  "C biometric outcomes"
);

const biometricSrc = read("src/storage/biometricLoginStorage.ts");
assert.ok(
  !/if \(!refresh\) \{\s*await clearBiometricLogin\(\)/.test(biometricSrc),
  "C: cancel/no-refresh must not call clearBiometricLogin()"
);

// D — password fallback
mustInclude(
  "src/storage/AuthContext.tsx",
  ["choosePasswordLogin", "password_fallback", "setPreferPasswordLoginThisSession"],
  "D password fallback"
);

mustInclude(
  "src/screens/BiometricUnlockScreen.tsx",
  ["Try fingerprint again", "Use password", "choosePasswordLogin"],
  "D unlock UI"
);

// E — navigation gating
mustInclude(
  "src/navigation/RootNavigator.tsx",
  ["BiometricUnlockScreen", "isBiometricLockPhase", 'authPhase === "authenticated"'],
  "E nav gating"
);

// F/G — refresh rejection / session replaced clear intentionally
mustInclude(
  "src/storage/AuthContext.tsx",
  [
    "refresh_rejected_after_biometric",
    "session_replaced",
    'reason: "session_expired"',
    "biometric_reconnected"
  ],
  "F/G refresh rejection + session expiry keep preference"
);

mustInclude(
  "src/storage/AuthContext.tsx",
  ["forceSessionExpiredLogout", "biometric_reconnected"],
  "F session expiry keeps biometric; password reconnects"
);

mustInclude(
  "src/storage/biometricLoginStorage.ts",
  ["via: \"refresh\"", "migrateLegacyBiometricPasswords", "legacy_password_material_cleared"],
  "F biometric unlock uses refresh only"
);

mustNotInclude(
  "src/storage/biometricLoginStorage.ts",
  [
    "saveBiometricReauthCredentials",
    "loginWithStoredReauthCredentials",
    "loginRequest(",
    "SecureStore.setItemAsync(LEGACY_REAUTH"
  ],
  "F never store or replay password for biometric"
);

// Assert no setItemAsync writes password/credential material
{
  const bio = read("src/storage/biometricLoginStorage.ts");
  assert.ok(
    !/SecureStore\.setItemAsync\(\s*(?:REAUTH_|LEGACY_REAUTH_|LEGACY_PASS|LEGACY_USER)/.test(bio),
    "F: must not write legacy password/username keys to SecureStore"
  );
  assert.ok(
    !/setItemAsync\([^)]*password/i.test(bio),
    "F: must not setItemAsync any password key"
  );
}

mustNotInclude(
  "src/storage/AuthContext.tsx",
  ['forceSessionExpiredLogout = useCallback(async () => {\n    await clearBiometricLogin()'],
  "F session expiry must not wipe fingerprint preference"
);

mustInclude(
  "App.tsx",
  ['shellVisible = phase === "app"', "markSplashUiReady", "resetSplashUiReady"],
  "splash then auth shell"
);

mustInclude(
  "src/screens/BiometricUnlockScreen.tsx",
  ["onSplashUiReady", "hasSplashUiReady"],
  "biometric waits for splash"
);

mustInclude(
  "src/storage/biometricLoginStorage.ts",
  ['outcome: "token_refresh_failed"', "SESSION_EXPIRED"],
  "refresh expiry returns token_refresh_failed"
);

// H — single bootstrap
mustInclude(
  "src/storage/AuthContext.tsx",
  ["bootstrapAttemptedRef", "foregroundBootstrapPromise"],
  "H single bootstrap"
);

// I — SecureStore migration
mustInclude(
  "src/features/duty/storage/dutyCacheStorage.ts",
  [
    "agri_duty_bootstrap_v2_u",
    "agri_duty_bootstrap_v1_u",
    "AsyncStorage",
    "migrateLegacySecureStore",
    "schemaVersion"
  ],
  "I duty cache migration"
);

mustNotInclude(
  "src/features/duty/storage/dutyCacheStorage.ts",
  ["SecureStore.setItemAsync"],
  "I never write duty cache to SecureStore"
);

// J — tracking gate
mustInclude(
  "src/tracking/trackingAuthGate.ts",
  ["tracking_deferred_auth_not_ready", "canSendAuthenticatedRequests"],
  "J tracking gate"
);

mustInclude(
  "src/api/tracking.ts",
  ["assertTrackingAuthReady"],
  "J pushLocation gate"
);

mustInclude(
  "src/api/client.ts",
  ["authState=", "tokenPresent=", "deviceSessionPresent="],
  "J API diagnostics"
);

console.log("test-biometric-auth-race: PASS (A–J static checks)");
