/**
 * Security regression: biometric must never persist or replay raw passwords.
 * Static audit of SecureStore writes + biometric unlock path.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function collectTsSources() {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
    }
  }
  walk(path.join(root, "src"));
  walk(path.join(root, "mobile"));
  return out;
}

const FORBIDDEN_SET_KEYS = [
  "biometric_login_pass",
  "biometric_login_user",
  "biometric_reauth_username",
  "biometric_reauth_password"
];

const bio = read("src/storage/biometricLoginStorage.ts");

// 1) Unlock path uses refresh only — never password login endpoint
assert.ok(bio.includes('via: "refresh"'), "unlock success must be via refresh");
assert.ok(!bio.includes("loginRequest("), "biometric must not call loginRequest");
assert.ok(!bio.includes("saveBiometricReauthCredentials"), "no password save API");
assert.ok(!bio.includes("loginWithStoredReauthCredentials"), "no password replay helper");

// 2) Legacy password keys are deleted, never written
for (const key of FORBIDDEN_SET_KEYS) {
  assert.ok(bio.includes(`"${key}"`) || bio.includes(`'${key}'`), `migration must know key ${key}`);
  const writePattern = new RegExp(`setItemAsync\\([^)]*${key}`);
  assert.ok(!writePattern.test(bio), `must not SecureStore.setItemAsync ${key}`);
}

assert.ok(bio.includes("deleteItemAsync(LEGACY_PASS_KEY)"), "must delete legacy pass");
assert.ok(bio.includes("deleteItemAsync(LEGACY_REAUTH_PASS_KEY)"), "must delete reauth pass");

// 3) canUseBiometricLogin requires refresh token, not stored password
assert.ok(
  /export async function canUseBiometricLogin[\s\S]*?getRefreshToken\(\)[\s\S]*?return Boolean\(refresh\)/.test(bio),
  "canUseBiometricLogin must gate on refresh token only"
);

// 4) enableBiometricLoginWithVerification takes no credentials
assert.match(
  bio,
  /export async function enableBiometricLoginWithVerification\(\):\s*Promise<boolean>/,
  "enable must not accept username/password"
);

// 5) Logs never interpolate secrets (no password/token values in logBiometric args)
{
  const logCalls = [...bio.matchAll(/logBiometric\(([^;]+)\)/g)].map((m) => m[1]);
  for (const call of logCalls) {
    assert.ok(!/\bpassword\s*:/.test(call), `logBiometric must not log password field: ${call.slice(0, 80)}`);
    assert.ok(!/\b(access|refresh)\s*:/.test(call), `logBiometric must not log token fields: ${call.slice(0, 80)}`);
  }
}

// 6) AuthContext must not save passwords after sign-in
const auth = read("src/storage/AuthContext.tsx");
assert.ok(!auth.includes("saveBiometricReauthCredentials"), "AuthContext must not save reauth password");
assert.ok(!auth.includes("clearBiometricReauthCredentials"), "AuthContext must not reference reauth password clear");
assert.ok(auth.includes("refresh_rejected_after_biometric"), "refresh rejection path present");
assert.ok(auth.includes('reason: "explicit_logout"'), "explicit logout clears session");

// 7) Settings/Login must not collect password for biometric enable
const settings = read("src/screens/SettingsScreen.tsx");
assert.ok(!settings.includes("passwordConfirm"), "Settings must not prompt password for biometric");
assert.ok(settings.includes("enableBiometricLoginWithVerification()"), "Settings enables without credentials");

const login = read("src/screens/LoginScreen.tsx");
assert.ok(
  login.includes("enableBiometricLoginWithVerification()"),
  "Login enrollment enables without storing password"
);

// 8) Repo-wide: no SecureStore writes of forbidden biometric password keys
for (const file of collectTsSources()) {
  const src = fs.readFileSync(file, "utf8");
  for (const key of FORBIDDEN_SET_KEYS) {
    if (!src.includes(key)) continue;
    const setHit = new RegExp(`setItemAsync\\(\\s*["'\`]${key}["'\`]`);
    const setViaConst = /setItemAsync\(\s*LEGACY_(?:PASS|USER|REAUTH)/.test(src);
    assert.ok(!setHit.test(src), `${path.relative(root, file)} must not setItemAsync "${key}"`);
    if (file.endsWith("biometricLoginStorage.ts")) {
      assert.ok(!setViaConst, "biometricLoginStorage must not setItemAsync legacy password consts");
    }
  }
}

// 9) Token storage keys are the session secrets (inventory check)
const tokens = read("src/storage/tokenStorage.ts");
assert.ok(tokens.includes('ACCESS_TOKEN_KEY = "agri_clinic_access_token"'));
assert.ok(tokens.includes('REFRESH_TOKEN_KEY = "agri_clinic_refresh_token"'));
assert.ok(!/password/i.test(tokens), "tokenStorage must not handle passwords");

const device = read("src/storage/deviceSessionStorage.ts");
assert.ok(device.includes('DEVICE_SESSION_KEY = "agri_clinic_device_session_id"'));

console.log("test-biometric-secure-store: PASS");
