import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { getRefreshToken } from "./tokenStorage";
import { refreshAccessTokenOnce } from "../api/tokenRefresh";

const ENABLED_KEY = "biometric_login_enabled";
/** @deprecated legacy plaintext password — always cleared on migration */
const LEGACY_PASS_KEY = "biometric_login_pass";
const LEGACY_USER_KEY = "biometric_login_user";

export type BiometricLoginStatus = {
  hardwareAvailable: boolean;
  enrolled: boolean;
  enabled: boolean;
  label: string;
};

let legacyCleared = false;

/** Remove any historically stored plaintext passwords. Safe to call often. */
export async function migrateLegacyBiometricPasswords(): Promise<void> {
  if (legacyCleared) return;
  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_PASS_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY).catch(() => undefined)
  ]);
  legacyCleared = true;
}

export async function getBiometricTypeLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "Face ID";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "Fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "Iris";
  }
  return "Biometrics";
}

export async function getBiometricLoginStatus(): Promise<BiometricLoginStatus> {
  await migrateLegacyBiometricPasswords();
  const [hardwareAvailable, enrolled, enabledFlag] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    SecureStore.getItemAsync(ENABLED_KEY)
  ]);

  return {
    hardwareAvailable,
    enrolled,
    enabled: enabledFlag === "1",
    label: await getBiometricTypeLabel()
  };
}

export async function canUseBiometricLogin(): Promise<boolean> {
  const status = await getBiometricLoginStatus();
  if (!status.hardwareAvailable || !status.enrolled || !status.enabled) {
    return false;
  }
  const refresh = await getRefreshToken();
  return Boolean(refresh);
}

/**
 * Enable biometric unlock after a successful password login.
 * Stores only an enablement flag — never the password.
 * Unlock uses the refresh token already kept in SecureStore by tokenStorage.
 */
export async function saveBiometricLogin(_username?: string, _password?: string): Promise<boolean> {
  await migrateLegacyBiometricPasswords();
  const [hardwareAvailable, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync()
  ]);
  if (!hardwareAvailable || !enrolled) {
    return false;
  }
  const refresh = await getRefreshToken();
  if (!refresh) {
    return false;
  }
  await SecureStore.setItemAsync(ENABLED_KEY, "1");
  return true;
}

/**
 * Prompt biometrics, then refresh the access token using the stored refresh token.
 * Returns true when the session can continue without re-entering a password.
 */
export async function unlockSessionWithBiometrics(): Promise<boolean> {
  await migrateLegacyBiometricPasswords();
  const enabled = await SecureStore.getItemAsync(ENABLED_KEY);
  if (enabled !== "1") {
    return false;
  }

  const refresh = await getRefreshToken();
  if (!refresh) {
    await clearBiometricLogin();
    return false;
  }

  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock your field workspace",
    cancelLabel: "Cancel",
    disableDeviceFallback: false
  });
  if (!auth.success) {
    return false;
  }

  const access = await refreshAccessTokenOnce();
  return Boolean(access);
}

/** @deprecated Passwords are never returned. Prefer unlockSessionWithBiometrics. */
export async function readBiometricCredentials(): Promise<null> {
  await migrateLegacyBiometricPasswords();
  return null;
}

export async function clearBiometricLogin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ENABLED_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_PASS_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY).catch(() => undefined)
  ]);
}

/** @deprecated Use saveBiometricLogin */
export async function enableBiometricLogin(username: string, password: string): Promise<boolean> {
  return saveBiometricLogin(username, password);
}
