/**
 * Security regression: biometric secrets only in Keystore SecureStore (v2).
 * Legacy plaintext keys must never be written. AsyncStorage must not hold secrets.
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

// 1) Unlock supports refresh (app-lock) and Keystore re-login
assert.ok(bio.includes('via: "refresh"') || bio.includes('action: "unlock_existing_session"'), "app-lock refresh path");
assert.ok(bio.includes("loginRequest("), "re-login may call loginRequest with Keystore material");
assert.ok(bio.includes("agri_bio_v2_secret"), "v2 Keystore secret key");
assert.ok(bio.includes("WHEN_UNLOCKED_THIS_DEVICE_ONLY"), "device-unlock Keystore accessibility");

// 2) Legacy password keys are deleted, never written
for (const key of FORBIDDEN_SET_KEYS) {
  assert.ok(bio.includes(`"${key}"`) || bio.includes(`'${key}'`), `migration must know key ${key}`);
  const writePattern = new RegExp(`setItemAsync\\([^)]*${key}`);
  assert.ok(!writePattern.test(bio), `must not SecureStore.setItemAsync ${key}`);
}

assert.ok(bio.includes("deleteItemAsync(LEGACY_PASS_KEY)"), "must delete legacy pass");
assert.ok(bio.includes("deleteItemAsync(LEGACY_REAUTH_PASS_KEY)"), "must delete reauth pass");

// 3) canUseBiometricLogin allows refresh OR reauth material
assert.ok(bio.includes("resolveBiometricAction"), "canonical action resolver");
assert.ok(bio.includes("reauthenticate_expired_session"), "expired-session re-login path");

// 4) Logs never interpolate secrets
{
  const logCalls = [...bio.matchAll(/logBiometric\(([^;]+)\)/g)].map((m) => m[1]);
  for (const call of logCalls) {
    assert.ok(!/\bpassword\s*:/.test(call), `logBiometric must not log password field: ${call.slice(0, 80)}`);
    assert.ok(!/\bsecret\s*:/.test(call), `logBiometric must not log secret field: ${call.slice(0, 80)}`);
  }
}

// 5) AuthContext clears biometric on explicit logout; keeps on session expiry
const auth = read("src/storage/AuthContext.tsx");
assert.ok(auth.includes("reconnectBiometricAfterPasswordLogin"), "password login refreshes Keystore material");
assert.ok(auth.includes('reason: "explicit_logout"'), "explicit logout clears session");
assert.ok(auth.includes('phase: "session_expired"'), "session expiry phase");

// 6) Repo-wide: no SecureStore writes of forbidden legacy keys; no AsyncStorage password
for (const file of collectTsSources()) {
  const src = fs.readFileSync(file, "utf8");
  for (const key of FORBIDDEN_SET_KEYS) {
    if (!src.includes(key)) continue;
    const setHit = new RegExp(`setItemAsync\\(\\s*["'\`]${key}["'\`]`);
    assert.ok(!setHit.test(src), `${path.relative(root, file)} must not setItemAsync "${key}"`);
  }
  if (/AsyncStorage\.setItem/.test(src) && /password/i.test(src) && file.includes("biometric")) {
    assert.fail(`${path.relative(root, file)} must not AsyncStorage biometric passwords`);
  }
}

// 7) Token storage keys inventory
const tokens = read("src/storage/tokenStorage.ts");
assert.ok(tokens.includes('ACCESS_TOKEN_KEY = "agri_clinic_access_token"'));
assert.ok(tokens.includes('REFRESH_TOKEN_KEY = "agri_clinic_refresh_token"'));
assert.ok(!/password/i.test(tokens), "tokenStorage must not handle passwords");

console.log("test-biometric-secure-store: PASS");
