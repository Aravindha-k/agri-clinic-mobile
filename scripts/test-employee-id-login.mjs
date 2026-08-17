/**
 * Employee ID login: KAC-0001 normalization, payload, biometric compatibility.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const MOBILE_LOGIN_PREFIX = "KAC-";
const LETTERS_HYPHEN_DIGITS = /^[A-Za-z]+-\d+$/;

function usesEmployeeIdPayload(identifier) {
  return LETTERS_HYPHEN_DIGITS.test(String(identifier ?? "").trim());
}

function isUnprefixedLegacyNumericId(value) {
  return LETTERS_HYPHEN_DIGITS.test(value) && !value.toUpperCase().startsWith(MOBILE_LOGIN_PREFIX);
}

function normalizeMobileLoginSuffix(raw) {
  let value = String(raw ?? "")
    .trim()
    .toUpperCase();
  while (value.startsWith(MOBILE_LOGIN_PREFIX)) {
    value = value.slice(MOBILE_LOGIN_PREFIX.length).trim();
  }
  if (isUnprefixedLegacyNumericId(value)) return value;
  return value.replace(/[^0-9]/g, "");
}

function toMobileLoginIdentifier(suffixOrFull) {
  const suffix = normalizeMobileLoginSuffix(suffixOrFull);
  if (!suffix) return "";
  if (isUnprefixedLegacyNumericId(suffix)) return suffix;
  return `${MOBILE_LOGIN_PREFIX}${suffix}`;
}

function buildMobileLoginBody(identifier, password) {
  const trimmed = identifier.trim();
  if (usesEmployeeIdPayload(trimmed)) {
    return { employee_id: trimmed, password };
  }
  return { username: trimmed, password };
}

test("A–D. Employee ID normalizes to KAC-0001 without a double prefix", () => {
  assert.equal(toMobileLoginIdentifier("0001"), "KAC-0001");
  assert.equal(toMobileLoginIdentifier("KAC-0001"), "KAC-0001");
  assert.equal(toMobileLoginIdentifier("kac-0001"), "KAC-0001");
  assert.equal(toMobileLoginIdentifier(" 0001"), "KAC-0001");
  assert.equal(toMobileLoginIdentifier("KAC-KAC-0001"), "KAC-0001");
  assert.equal(normalizeMobileLoginSuffix("KAC-0001"), "0001");
  assert.equal(toMobileLoginIdentifier("0010"), "KAC-0010");
  assert.equal(toMobileLoginIdentifier("0100"), "KAC-0100");
  assert.equal(toMobileLoginIdentifier("1000"), "KAC-1000");
  assert.notEqual(toMobileLoginIdentifier("0001"), "KAC-KAC-0001");

  const util = read("src/utils/mobileLoginUsername.ts");
  assert.match(util, /toMobileLoginIdentifier/);
  assert.match(util, /Never KAC-KAC-0001/);
});

test("E. Password case is unchanged", () => {
  const secret = "PaSsWoRd! ";
  assert.equal(buildMobileLoginBody("KAC-0001", secret).password, secret);
  const login = read("src/screens/LoginScreen.tsx");
  const handle = login.slice(login.indexOf("async function handleLogin"), login.indexOf("async function handleBiometricLogin"));
  assert.doesNotMatch(handle, /password\.toLowerCase|password\.toUpperCase/);
  assert.match(handle, /await signIn\(user, password\)/);
  const authApi = read("src/api/auth.ts");
  assert.match(authApi, /buildMobileLoginBody\(trimmed, password\)/);
});

test("F. Employee ID login payload uses employee_id", () => {
  assert.deepEqual(buildMobileLoginBody("KAC-0001", "secret"), {
    employee_id: "KAC-0001",
    password: "secret"
  });
  const authApi = read("src/api/auth.ts");
  assert.match(authApi, /buildMobileLoginBody\(trimmed, password\)/);
  assert.match(authApi, /mobile\/auth\/login\//);
});

test("G. Legacy stored username still uses username payload during compatibility", () => {
  assert.deepEqual(buildMobileLoginBody("KAC-ARAVINDH01", "secret"), {
    username: "KAC-ARAVINDH01",
    password: "secret"
  });
  const bio = read("src/storage/biometricLoginStorage.ts");
  assert.match(bio, /loginRequest\(identifier\.trim\(\), secret\)/);
  assert.match(bio, /REAUTH_IDENTIFIER_KEY/);
});

test("H. New Employee ID password login reconnects biometric with that identifier", () => {
  const auth = read("src/storage/AuthContext.tsx");
  const signIn = auth.slice(auth.indexOf("const signIn = useCallback"), auth.indexOf("const attemptBiometricUnlock"));
  assert.match(signIn, /reconnectBiometricAfterPasswordLogin/);
  assert.match(signIn, /identifier:\s*username/);
  const bio = read("src/storage/biometricLoginStorage.ts");
  assert.match(bio, /saveBiometricReauthMaterial/);
  assert.match(bio, /SecureStore\.setItemAsync\(REAUTH_IDENTIFIER_KEY, identifier/);
});

test("I–K. Logout, inactive/reactivate, and SESSION_REPLACED are unchanged", () => {
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /forceEmployeeInactiveLogout/);
  assert.match(auth, /SESSION_REPLACED|session_replaced/);
  assert.match(auth, /clearBiometricReauthMaterial/);
  const logout = read("src/api/auth.ts");
  assert.match(logout, /mobile\/auth\/logout\//);
  const login = read("src/screens/LoginScreen.tsx");
  assert.match(login, /EMPLOYEE_INACTIVE|ACCOUNT_DISABLED/);
  assert.match(login, /login\.accountDisabled/);
});

test("L. Login UI is Employee ID with no name-based username example", () => {
  const login = read("src/screens/LoginScreen.tsx");
  const en = read("src/i18n/en.ts");
  const ta = read("src/i18n/ta.ts");
  assert.match(login, /t\("login\.employeeId"\)/);
  assert.match(login, /placeholder=""/);
  assert.doesNotMatch(login, /ARAVINDH01|KAVYA01|DIVYA01/);
  assert.match(en, /employeeId: "Employee ID"/);
  assert.match(en, /submit: "Sign in"/);
  assert.doesNotMatch(en.slice(en.indexOf("login:"), en.indexOf("a11y:")), /Username|User name|ARAVINDH01/);
  assert.match(ta, /employeeId: "பணியாளர் ஐடி"/);
  assert.match(login, /MOBILE_LOGIN_PREFIX/);
});
