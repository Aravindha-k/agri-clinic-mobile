import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { getRefreshToken } from "./tokenStorage";
import { refreshAccessTokenOnce } from "../api/tokenRefresh";

const ENABLED_KEY = "biometric_login_enabled";
const PROMPT_DISMISSED_KEY = "biometric_login_prompt_dismissed";
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

export async function isBiometricEnrollmentDismissed(): Promise<boolean> {
  const dismissed = await SecureStore.getItemAsync(PROMPT_DISMISSED_KEY);
  return dismissed === "1";
}

export async function dismissBiometricEnrollmentPrompt(): Promise<void> {
  await SecureStore.setItemAsync(PROMPT_DISMISSED_KEY, "1");
}

export async function clearBiometricEnrollmentDismissed(): Promise<void> {
  await SecureStore.deleteItemAsync(PROMPT_DISMISSED_KEY).catch(() => undefined);
}

/** True when we may show the one-time enrollment prompt after password login. */
export async function shouldOfferBiometricEnrollment(): Promise<boolean> {
  const [status, dismissed] = await Promise.all([
    getBiometricLoginStatus(),
    isBiometricEnrollmentDismissed()
  ]);
  if (!status.hardwareAvailable || !status.enrolled || status.enabled || dismissed) {
    return false;
  }
  const refresh = await getRefreshToken();
  return Boolean(refresh);
}

/**
 * Verify biometric once, then persist the enablement flag.
 * Never stores the password.
 */
export async function enableBiometricLoginWithVerification(): Promise<boolean> {
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

  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: "Confirm fingerprint to enable faster login",
    cancelLabel: "Cancel",
    disableDeviceFallback: false
  });
  if (!auth.success) {
    return false;
  }

  await SecureStore.setItemAsync(ENABLED_KEY, "1");
  await clearBiometricEnrollmentDismissed();
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
    SecureStore.deleteItemAsync(PROMPT_DISMISSED_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_PASS_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY).catch(() => undefined)
  ]);
}

/** @deprecated Use enableBiometricLoginWithVerification */
export async function saveBiometricLogin(_username?: string, _password?: string): Promise<boolean> {
  return enableBiometricLoginWithVerification();
}

/** @deprecated Use enableBiometricLoginWithVerification */
export async function enableBiometricLogin(username: string, password: string): Promise<boolean> {
  return enableBiometricLoginWithVerification();
}
