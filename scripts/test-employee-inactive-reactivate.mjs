/**
 * Employee deactivate → reactivate → fresh password login recovery.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const EMPLOYEE_INACTIVE_CODES = new Set(["EMPLOYEE_INACTIVE", "ACCOUNT_DISABLED"]);

function isEmployeeInactiveCode(code) {
  if (!code) return false;
  return EMPLOYEE_INACTIVE_CODES.has(String(code).trim().toUpperCase());
}

test("1–4. EMPLOYEE_INACTIVE constants + no persistent inactive-forever flag", () => {
  const constants = read("src/constants/employeeInactive.ts");
  assert.match(constants, /EMPLOYEE_INACTIVE/);
  assert.match(constants, /ACCOUNT_DISABLED/);
  assert.match(constants, /Your account has been deactivated/);

  const inactive = read("src/storage/employeeInactive.ts");
  assert.match(inactive, /bumpAuthTeardownEpoch/);
  assert.match(inactive, /handleEmployeeInactive/);
  assert.match(inactive, /registerEmployeeInactiveTeardown/);
  assert.doesNotMatch(inactive, /AsyncStorage|SecureStore/);

  // No durable blocked_forever / login_disabled keys in auth stack
  const auth = read("src/storage/AuthContext.tsx");
  assert.doesNotMatch(auth, /blocked_forever|login_disabled|account_disabled_flag|force_logout_reason/);
  assert.match(auth, /forceEmployeeInactiveLogout/);
  assert.match(auth, /clearBiometricReauthMaterial\("employee_inactive"\)/);
  assert.match(auth, /setPreferPasswordLoginThisSession\(true\)/);
  assert.match(auth, /phase:\s*"unauthenticated"/);
  assert.match(auth, /EMPLOYEE_INACTIVE_MESSAGE/);
});

test("5–8. Fresh login clears stale tokens/session; new DeviceSession saved", () => {
  const auth = read("src/storage/AuthContext.tsx");
  const signIn = auth.slice(auth.indexOf("const signIn = useCallback"), auth.indexOf("const attemptBiometricUnlock"));
  assert.match(signIn, /bumpAuthTeardownEpoch\(\)/);
  assert.match(signIn, /clearTokens\(\)/);
  assert.match(signIn, /clearDeviceSessionId/);
  assert.match(signIn, /loginRequest\(username, password\)/);
  assert.match(signIn, /saveTokens\(tokens\)/);
  assert.match(signIn, /reconnectBiometricAfterPasswordLogin/);
  assert.match(signIn, /setLoginNotice\(null\)/);

  const authApi = read("src/api/auth.ts");
  assert.match(authApi, /clearDeviceSessionId/);
  assert.match(authApi, /saveDeviceSessionId\(normalized\.deviceSessionId\)/);
  assert.match(authApi, /mobile\/auth\/login\//);
  assert.match(authApi, /auth:\s*false/);
});

test("9. Inactive message cleared after successful login; shown while inactive", () => {
  const en = read("src/i18n/en.ts");
  assert.match(en, /accountDisabled: "Your account has been deactivated/);

  const login = read("src/screens/LoginScreen.tsx");
  assert.match(login, /EMPLOYEE_INACTIVE|ACCOUNT_DISABLED/);
  assert.match(login, /t\("login\.accountDisabled"\)/);

  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /setLoginNotice\(null\)/);
});

test("10–12. Biometric blocked after inactive; password reconnects material", () => {
  const bio = read("src/storage/biometricLoginStorage.ts");
  assert.match(bio, /isEmployeeInactiveCode/);
  assert.match(bio, /clearBiometricReauthMaterial/);
  // Must NOT wipe ENABLED preference on inactive
  const mapRefresh = bio.slice(bio.indexOf("function mapRefreshError"), bio.indexOf("export async function unlockSessionWithBiometrics"));
  assert.match(mapRefresh, /isEmployeeInactiveCode/);
  assert.doesNotMatch(
    mapRefresh.slice(mapRefresh.indexOf("isEmployeeInactiveCode")),
    /clearBiometricCredentialMaterial\(code\)/
  );

  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /biometric_reconnected/);
  assert.match(auth, /clearBiometricReauthMaterial\("employee_inactive"\)/);
  assert.doesNotMatch(
    auth.slice(auth.indexOf("forceEmployeeInactiveLogout"), auth.indexOf("registerEmployeeInactiveTeardown")),
    /clearBiometricLogin/
  );
});

test("13. Network errors are not mapped to EMPLOYEE_INACTIVE", () => {
  const login = read("src/screens/LoginScreen.tsx");
  assert.match(login, /isNetworkError\(error\)/);
  assert.match(login, /getNetworkMessage\(\)/);

  const diag = read("src/utils/loginDiagnostics.ts");
  assert.match(diag, /NETWORK_ERROR/);
  assert.ok(isEmployeeInactiveCode("EMPLOYEE_INACTIVE"));
  assert.ok(isEmployeeInactiveCode("ACCOUNT_DISABLED"));
  assert.equal(isEmployeeInactiveCode("NETWORK_ERROR"), false);
});

test("14. KAC- username helpers remain correct", () => {
  const util = read("src/utils/mobileLoginUsername.ts");
  assert.match(util, /MOBILE_LOGIN_PREFIX = "KAC-"/);
  assert.match(util, /toMobileLoginIdentifier/);
  const login = read("src/screens/LoginScreen.tsx");
  assert.match(login, /toMobileLoginIdentifier\(empId\)/);
});

test("Deferred session-expired teardown cannot wipe post-login session", () => {
  const expired = read("src/storage/sessionExpired.ts");
  assert.match(expired, /getAuthTeardownEpoch/);
  assert.match(expired, /scheduledEpoch !== getAuthTeardownEpoch/);
});

test("API client + refresh route EMPLOYEE_INACTIVE to dedicated handler", () => {
  const client = read("src/api/client.ts");
  assert.match(client, /handleEmployeeInactive/);
  assert.match(client, /isEmployeeInactiveCode/);
  assert.match(client, /EMPLOYEE_INACTIVE_MESSAGE/);

  const refresh = read("src/api/tokenRefresh.ts");
  assert.match(refresh, /handleEmployeeInactive/);
  assert.match(refresh, /EMPLOYEE_INACTIVE_MESSAGE/);
  assert.doesNotMatch(
    refresh.slice(refresh.indexOf("response.status === 403"), refresh.indexOf("if (!response.ok)")),
    /handleSessionExpired\(\)/
  );
});
