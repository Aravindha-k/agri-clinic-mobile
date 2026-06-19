import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const ENABLED_KEY = "biometric_login_enabled";
const USER_KEY = "biometric_login_user";
const PASS_KEY = "biometric_login_pass";

export type BiometricLoginStatus = {
  hardwareAvailable: boolean;
  enrolled: boolean;
  enabled: boolean;
  label: string;
};

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

  const [username, password] = await Promise.all([
    SecureStore.getItemAsync(USER_KEY),
    SecureStore.getItemAsync(PASS_KEY)
  ]);
  return Boolean(username && password);
}

/** Save credentials after a successful password sign-in (no extra biometric prompt). */
export async function saveBiometricLogin(username: string, password: string): Promise<boolean> {
  const [hardwareAvailable, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync()
  ]);
  if (!hardwareAvailable || !enrolled) {
    return false;
  }

  await SecureStore.setItemAsync(USER_KEY, username.trim());
  await SecureStore.setItemAsync(PASS_KEY, password);
  await SecureStore.setItemAsync(ENABLED_KEY, "1");
  return true;
}

export async function readBiometricCredentials(): Promise<{ username: string; password: string } | null> {
  const enabled = await SecureStore.getItemAsync(ENABLED_KEY);
  if (enabled !== "1") {
    return null;
  }

  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: "Sign in to your field workspace",
    cancelLabel: "Cancel",
    disableDeviceFallback: false
  });
  if (!auth.success) {
    return null;
  }

  const [username, password] = await Promise.all([
    SecureStore.getItemAsync(USER_KEY),
    SecureStore.getItemAsync(PASS_KEY)
  ]);

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

export async function clearBiometricLogin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ENABLED_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(PASS_KEY).catch(() => undefined)
  ]);
}

/** @deprecated Use saveBiometricLogin */
export async function enableBiometricLogin(username: string, password: string): Promise<boolean> {
  return saveBiometricLogin(username, password);
}
