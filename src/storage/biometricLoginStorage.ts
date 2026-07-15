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

/** Structured biometric logs. Never includes tokens/secrets/secure-store values. */
type BiometricLogEvent =
  | "capability_checked"
  | "onboarding_required"
  | "onboarding_skipped"
  | "setup_started"
  | "setup_success"
  | "setup_failed"
  | "login_prompt_started"
  | "login_success"
  | "login_cancelled"
  | "login_failed"
  | "prompt_suppressed_duplicate"
  | "enabled_flag_cleared";

export function logBiometric(event: BiometricLogEvent, detail?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[Biometric] ${event}`, detail ?? {});
}

let legacyCleared = false;

/**
 * Only one native biometric prompt may be active at a time. Prevents duplicate
 * prompts from React Strict Mode, focus listeners, token hydration, and
 * repeated app-state events all racing into authenticateAsync().
 */
let biometricPromptInProgress = false;

/**
 * One auto-unlock attempt per app launch (process). Survives LoginScreen
 * remounts so navigation/tab changes never re-open the prompt on their own.
 */
let unlockAttemptedThisLaunch = false;

export function hasAttemptedBiometricUnlockThisLaunch(): boolean {
  return unlockAttemptedThisLaunch;
}

export function markBiometricUnlockAttempted(): void {
  unlockAttemptedThisLaunch = true;
}

export function isBiometricPromptInProgress(): boolean {
  return biometricPromptInProgress;
}

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

  const status = {
    hardwareAvailable,
    enrolled,
    enabled: enabledFlag === "1",
    label: await getBiometricTypeLabel()
  };
  logBiometric("capability_checked", {
    hardwareAvailable,
    enrolled,
    enabled: status.enabled
  });
  return status;
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
    logBiometric("onboarding_skipped", {
      hardwareAvailable: status.hardwareAvailable,
      enrolled: status.enrolled,
      enabled: status.enabled,
      dismissed
    });
    return false;
  }
  const refresh = await getRefreshToken();
  if (!refresh) {
    logBiometric("onboarding_skipped", { reason: "no_refresh_token" });
    return false;
  }
  logBiometric("onboarding_required");
  return true;
}

/**
 * Verify biometric once, then persist the enablement flag.
 * Never stores the password.
 */
export async function enableBiometricLoginWithVerification(): Promise<boolean> {
  await migrateLegacyBiometricPasswords();
  if (biometricPromptInProgress) {
    logBiometric("prompt_suppressed_duplicate", { source: "setup" });
    return false;
  }
  const [hardwareAvailable, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync()
  ]);
  if (!hardwareAvailable || !enrolled) {
    logBiometric("setup_failed", { reason: "no_hardware_or_enrollment" });
    return false;
  }
  const refresh = await getRefreshToken();
  if (!refresh) {
    logBiometric("setup_failed", { reason: "no_refresh_token" });
    return false;
  }

  biometricPromptInProgress = true;
  logBiometric("setup_started");
  try {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirm fingerprint to enable faster login",
      cancelLabel: "Cancel",
      disableDeviceFallback: false
    });
    if (!auth.success) {
      logBiometric("setup_failed", { reason: auth.error ?? "not_successful" });
      return false;
    }

    await SecureStore.setItemAsync(ENABLED_KEY, "1");
    await clearBiometricEnrollmentDismissed();
    logBiometric("setup_success");
    return true;
  } finally {
    biometricPromptInProgress = false;
  }
}

/**
 * Prompt biometrics, then refresh the access token using the stored refresh token.
 * Returns true when the session can continue without re-entering a password.
 */
export async function unlockSessionWithBiometrics(): Promise<boolean> {
  await migrateLegacyBiometricPasswords();
  if (biometricPromptInProgress) {
    logBiometric("prompt_suppressed_duplicate", { source: "login" });
    return false;
  }
  const enabled = await SecureStore.getItemAsync(ENABLED_KEY);
  if (enabled !== "1") {
    return false;
  }

  const refresh = await getRefreshToken();
  if (!refresh) {
    await clearBiometricLogin();
    return false;
  }

  biometricPromptInProgress = true;
  // Any real prompt counts as this launch's auto attempt so it cannot re-open
  // itself on the next LoginScreen remount.
  unlockAttemptedThisLaunch = true;
  logBiometric("login_prompt_started");
  try {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock your field workspace",
      cancelLabel: "Cancel",
      disableDeviceFallback: false
    });
    if (!auth.success) {
      logBiometric("login_cancelled", { error: auth.error ?? "not_successful" });
      return false;
    }

    const access = await refreshAccessTokenOnce();
    if (access) {
      logBiometric("login_success");
      return true;
    }
    logBiometric("login_failed", { reason: "token_refresh_failed" });
    return false;
  } finally {
    biometricPromptInProgress = false;
  }
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
  logBiometric("enabled_flag_cleared");
}

/** @deprecated Use enableBiometricLoginWithVerification */
export async function saveBiometricLogin(_username?: string, _password?: string): Promise<boolean> {
  return enableBiometricLoginWithVerification();
}

/** @deprecated Use enableBiometricLoginWithVerification */
export async function enableBiometricLogin(username: string, password: string): Promise<boolean> {
  return enableBiometricLoginWithVerification();
}
