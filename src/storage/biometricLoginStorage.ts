import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { getRefreshToken } from "./tokenStorage";
import { refreshAccessTokenOnce } from "../api/tokenRefresh";
import { STARTUP_TIMEOUTS } from "../bootstrap/startupCoordinator";
import { withTimeout } from "../utils/withTimeout";
import { ApiRequestError, isNetworkError, isServerError } from "../utils/apiError";

const ENABLED_KEY = "biometric_login_enabled";
const PROMPT_DISMISSED_KEY = "biometric_login_prompt_dismissed";
/** @deprecated legacy plaintext password — always cleared on migration */
const LEGACY_PASS_KEY = "biometric_login_pass";
const LEGACY_USER_KEY = "biometric_login_user";
/** OEM biometric prompts that never settle must not block login forever. */
const BIOMETRIC_PROMPT_MS = 45_000;

export type BiometricLoginStatus = {
  hardwareAvailable: boolean;
  enrolled: boolean;
  enabled: boolean;
  label: string;
};

export type BiometricUnlockOutcome =
  | "success"
  | "user_cancel"
  | "authentication_failed"
  | "lockout"
  | "not_enrolled"
  | "hardware_unavailable"
  | "key_invalidated"
  | "no_refresh_token"
  | "token_refresh_failed"
  | "network_error"
  | "server_error"
  | "prompt_busy"
  | "not_enabled"
  | "timeout";

export type BiometricUnlockResult = {
  ok: boolean;
  outcome: BiometricUnlockOutcome;
};

/** Structured biometric logs. Never includes tokens/secrets/secure-store values. */
type BiometricLogEvent =
  | "capability_checked"
  | "onboarding_required"
  | "onboarding_skipped"
  | "setup_started"
  | "setup_success"
  | "setup_failed"
  | "prompt_started"
  | "prompt_result"
  | "login_prompt_started"
  | "login_success"
  | "login_cancelled"
  | "login_failed"
  | "prompt_suppressed_duplicate"
  | "enabled_flag_cleared"
  | "biometric_material_cleared";

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

/** User chose password on the unlock screen — do not auto-prompt again this session. */
let preferPasswordLoginThisSession = false;

export function hasAttemptedBiometricUnlockThisLaunch(): boolean {
  return unlockAttemptedThisLaunch;
}

export function markBiometricUnlockAttempted(): void {
  unlockAttemptedThisLaunch = true;
}

export function resetBiometricUnlockAttemptForTests(): void {
  unlockAttemptedThisLaunch = false;
  biometricPromptInProgress = false;
  preferPasswordLoginThisSession = false;
}

/** Allow a fresh auto-prompt after sign-out / splash replay. */
export function resetBiometricUnlockAttemptThisLaunch(): void {
  unlockAttemptedThisLaunch = false;
  biometricPromptInProgress = false;
}

export function isBiometricPromptInProgress(): boolean {
  return biometricPromptInProgress;
}

export function setPreferPasswordLoginThisSession(value: boolean): void {
  preferPasswordLoginThisSession = value;
}

export function shouldPreferPasswordLoginThisSession(): boolean {
  return preferPasswordLoginThisSession;
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
  try {
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
  } catch {
    // OEM biometric query can throw — treat as generic label.
  }
  return "Biometrics";
}

const EMPTY_BIOMETRIC_STATUS: BiometricLoginStatus = {
  hardwareAvailable: false,
  enrolled: false,
  enabled: false,
  label: "Biometrics"
};

export async function getBiometricLoginStatus(): Promise<BiometricLoginStatus> {
  try {
    await migrateLegacyBiometricPasswords();
    const [hardwareAvailable, enrolled, enabledFlag] = await Promise.all([
      withTimeout(LocalAuthentication.hasHardwareAsync().catch(() => false), STARTUP_TIMEOUTS.biometricLookupMs, false, "hasHardwareAsync"),
      withTimeout(LocalAuthentication.isEnrolledAsync().catch(() => false), STARTUP_TIMEOUTS.biometricLookupMs, false, "isEnrolledAsync"),
      withTimeout(SecureStore.getItemAsync(ENABLED_KEY).catch(() => null), STARTUP_TIMEOUTS.biometricLookupMs, null, "biometric_enabled_flag")
    ]);

    const status = {
      hardwareAvailable: Boolean(hardwareAvailable),
      enrolled: Boolean(enrolled),
      enabled: enabledFlag === "1",
      label: await getBiometricTypeLabel()
    };
    logBiometric("capability_checked", {
      hardwareAvailable: status.hardwareAvailable,
      enrolled: status.enrolled,
      enabled: status.enabled
    });
    return status;
  } catch (err) {
    logBiometric("capability_checked", {
      hardwareAvailable: false,
      enrolled: false,
      enabled: false,
      error: err instanceof Error ? err.message : "capability_failed"
    });
    return { ...EMPTY_BIOMETRIC_STATUS };
  }
}

export async function canUseBiometricLogin(): Promise<boolean> {
  try {
    const status = await getBiometricLoginStatus();
    if (!status.hardwareAvailable || !status.enrolled || !status.enabled) {
      return false;
    }
    const refresh = await getRefreshToken();
    return Boolean(refresh);
  } catch {
    return false;
  }
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
    const auth = await withTimeout(
      LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm fingerprint to enable faster login",
        cancelLabel: "Cancel",
        disableDeviceFallback: false
      }),
      BIOMETRIC_PROMPT_MS,
      { success: false, error: "timeout" } as LocalAuthentication.LocalAuthenticationResult,
      "biometric_setup_prompt"
    );
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

function mapLocalAuthError(error: string | undefined): BiometricUnlockOutcome {
  const code = (error ?? "").toLowerCase();
  if (!code || code === "user_cancel" || code === "system_cancel" || code === "app_cancel" || code === "user_fallback") {
    return "user_cancel";
  }
  if (code === "authentication_failed" || code === "not_interactive") {
    return "authentication_failed";
  }
  if (code === "lockout" || code === "lockout_permanent") {
    return "lockout";
  }
  if (code === "not_enrolled") {
    return "not_enrolled";
  }
  if (code === "timeout") {
    return "timeout";
  }
  if (
    code === "passcode_not_set" ||
    code === "not_available" ||
    code === "missing_usage_description" ||
    code === "no_hardware"
  ) {
    return "hardware_unavailable";
  }
  // Expo / OEM may surface invalidated keys as unknown or unable_to_process.
  if (code.includes("invalidat") || code === "unable_to_process") {
    return "key_invalidated";
  }
  return "authentication_failed";
}

/**
 * Clear only biometric preference material — never tokens or device session.
 * Use for permanent key invalidation or explicit user disable in Settings.
 */
export async function clearBiometricCredentialMaterial(reason: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ENABLED_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(PROMPT_DISMISSED_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_PASS_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY).catch(() => undefined)
  ]);
  logBiometric("biometric_material_cleared", { reason });
}

/**
 * Prompt biometrics, then refresh the access token using the stored refresh token.
 * Cancel / mismatch / lockout never clears tokens or the biometric-enabled flag.
 */
export async function unlockSessionWithBiometrics(): Promise<BiometricUnlockResult> {
  await migrateLegacyBiometricPasswords();
  if (biometricPromptInProgress) {
    logBiometric("prompt_suppressed_duplicate", { source: "login" });
    return { ok: false, outcome: "prompt_busy" };
  }
  const enabled = await SecureStore.getItemAsync(ENABLED_KEY);
  if (enabled !== "1") {
    return { ok: false, outcome: "not_enabled" };
  }

  const [hardwareAvailable, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync().catch(() => false),
    LocalAuthentication.isEnrolledAsync().catch(() => false)
  ]);
  if (!hardwareAvailable) {
    logBiometric("prompt_result", { outcome: "hardware_unavailable" });
    return { ok: false, outcome: "hardware_unavailable" };
  }
  if (!enrolled) {
    // Enrollment removed after enable — clear biometric material only, keep tokens.
    await clearBiometricCredentialMaterial("not_enrolled_after_enable");
    logBiometric("prompt_result", { outcome: "key_invalidated" });
    return { ok: false, outcome: "key_invalidated" };
  }

  const refresh = await getRefreshToken();
  if (!refresh) {
    // Incomplete credentials — do not disable biometric preference; password login can re-bind.
    logBiometric("prompt_result", { outcome: "no_refresh_token" });
    return { ok: false, outcome: "no_refresh_token" };
  }

  biometricPromptInProgress = true;
  unlockAttemptedThisLaunch = true;
  logBiometric("prompt_started");
  logBiometric("login_prompt_started");
  try {
    const auth = await withTimeout(
      LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock your field workspace",
        cancelLabel: "Cancel",
        disableDeviceFallback: false
      }),
      BIOMETRIC_PROMPT_MS,
      { success: false, error: "timeout" } as LocalAuthentication.LocalAuthenticationResult,
      "biometric_login_prompt"
    );
    if (!auth.success) {
      const outcome = mapLocalAuthError(auth.error);
      if (outcome === "user_cancel" || outcome === "timeout") {
        logBiometric("login_cancelled", { error: auth.error ?? outcome });
      } else {
        logBiometric("login_failed", { error: auth.error ?? outcome });
      }
      logBiometric("prompt_result", { outcome });
      if (outcome === "key_invalidated") {
        await clearBiometricCredentialMaterial("platform_key_invalidated");
      }
      return { ok: false, outcome };
    }

    const access = await refreshAccessTokenOnce();
    if (access) {
      logBiometric("login_success");
      logBiometric("prompt_result", { outcome: "success" });
      return { ok: true, outcome: "success" };
    }
    logBiometric("login_failed", { reason: "token_refresh_failed" });
    logBiometric("prompt_result", { outcome: "token_refresh_failed" });
    return { ok: false, outcome: "token_refresh_failed" };
  } catch (err) {
    if (isNetworkError(err)) {
      logBiometric("login_failed", { reason: "network_error" });
      logBiometric("prompt_result", { outcome: "network_error" });
      return { ok: false, outcome: "network_error" };
    }
    if (isServerError(err)) {
      logBiometric("login_failed", { reason: "server_error" });
      logBiometric("prompt_result", { outcome: "server_error" });
      return { ok: false, outcome: "server_error" };
    }
    const code =
      err instanceof ApiRequestError
        ? err.code
        : err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code ?? "")
          : "";
    if (code === "SESSION_EXPIRED" || code === "ACCOUNT_DISABLED" || code === "SESSION_REPLACED") {
      logBiometric("login_failed", { reason: code });
      logBiometric("prompt_result", { outcome: "token_refresh_failed" });
      return { ok: false, outcome: "token_refresh_failed" };
    }
    if (code === "AUTH_UNCERTAIN") {
      logBiometric("login_failed", { reason: "auth_uncertain" });
      logBiometric("prompt_result", { outcome: "network_error" });
      return { ok: false, outcome: "network_error" };
    }
    logBiometric("login_failed", {
      reason: err instanceof Error ? err.message : "refresh_error"
    });
    logBiometric("prompt_result", { outcome: "network_error" });
    return { ok: false, outcome: "network_error" };
  } finally {
    biometricPromptInProgress = false;
  }
}

/** @deprecated Passwords are never returned. Prefer unlockSessionWithBiometrics. */
export async function readBiometricCredentials(): Promise<null> {
  await migrateLegacyBiometricPasswords();
  return null;
}

/**
 * Explicit disable (Settings) or confirmed permanent invalidation.
 * Do not call on cancel / failed fingerprint / Expo Go quirks.
 */
export async function clearBiometricLogin(): Promise<void> {
  await clearBiometricCredentialMaterial("explicit_clear");
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
