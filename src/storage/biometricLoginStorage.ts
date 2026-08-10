/**
 * Biometric app-lock + session re-login.
 *
 * App-lock: valid refresh token still exists → fingerprint unlocks UI, silent refresh.
 * Re-login: refresh gone / expired → fingerprint reads Keystore re-auth material → login API.
 *
 * Re-auth secret lives only in SecureStore (Keystore-backed). Never plain device storage or logs.
 */
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../api/config";
import { loginRequest } from "../api/auth";
import { refreshAccessTokenOnce } from "../api/tokenRefresh";
import { STARTUP_TIMEOUTS } from "../bootstrap/startupCoordinator";
import { withTimeout } from "../utils/withTimeout";
import { ApiRequestError, isNetworkError, isServerError } from "../utils/apiError";
import { isEmployeeInactiveCode } from "../constants/employeeInactive";
import { getRefreshToken, saveTokens } from "./tokenStorage";

const ENABLED_KEY = "biometric_login_enabled";
const PROMPT_DISMISSED_KEY = "biometric_login_prompt_dismissed";

/** @deprecated legacy plaintext password — deleted on every migration pass */
const LEGACY_PASS_KEY = "biometric_login_pass";
const LEGACY_USER_KEY = "biometric_login_user";
/** @deprecated password reauth keys — deleted on migration */
const LEGACY_REAUTH_USER_KEY = "biometric_reauth_username";
const LEGACY_REAUTH_PASS_KEY = "biometric_reauth_password";

/** Keystore-backed re-auth (v2) — not the forbidden legacy keys. */
const REAUTH_IDENTIFIER_KEY = "agri_bio_v2_identifier";
const REAUTH_SECRET_KEY = "agri_bio_v2_secret";
const REAUTH_META_KEY = "agri_bio_v2_meta";

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
};

/** OEM biometric prompts that never settle must not block login forever. */
const BIOMETRIC_PROMPT_MS = 45_000;

export type BiometricAction = "unlock_existing_session" | "reauthenticate_expired_session";

export type BiometricLoginStatus = {
  hardwareAvailable: boolean;
  enrolled: boolean;
  enabled: boolean;
  label: string;
  /** True when Keystore re-auth material is present for this employee + API env. */
  reauthMaterialReady: boolean;
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
  | "reauth_material_missing"
  | "reauth_material_invalid"
  | "session_replaced"
  | "network_error"
  | "server_error"
  | "prompt_busy"
  | "not_enabled"
  | "timeout";

export type BiometricUnlockResult = {
  ok: boolean;
  outcome: BiometricUnlockOutcome;
  action?: BiometricAction;
};

type BiometricReauthMeta = {
  userId: number;
  apiEnv: string;
};

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
  | "login_refresh_fallback_reauth"
  | "legacy_password_material_cleared"
  | "prompt_suppressed_duplicate"
  | "enabled_flag_cleared"
  | "biometric_material_cleared"
  | "reauth_material_saved"
  | "reauth_material_cleared"
  | "reauth_env_mismatch";

export function logBiometric(event: BiometricLogEvent, detail?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[Biometric] ${event}`, detail ?? {});
}

let legacyCleared = false;
let biometricPromptInProgress = false;
let unlockAttemptedThisLaunch = false;
let preferPasswordLoginThisSession = false;
let biometricActionInFlight: Promise<BiometricUnlockResult> | null = null;

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
  biometricActionInFlight = null;
}

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

function apiEnvFingerprint(): string {
  return String(API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

export async function migrateLegacyBiometricPasswords(): Promise<void> {
  if (legacyCleared) return;
  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_PASS_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_REAUTH_USER_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_REAUTH_PASS_KEY).catch(() => undefined)
  ]);
  legacyCleared = true;
  logBiometric("legacy_password_material_cleared");
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

async function readReauthMeta(): Promise<BiometricReauthMeta | null> {
  try {
    const raw = await SecureStore.getItemAsync(REAUTH_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BiometricReauthMeta>;
    if (typeof parsed.userId !== "number" || typeof parsed.apiEnv !== "string") return null;
    return { userId: parsed.userId, apiEnv: parsed.apiEnv };
  } catch {
    return null;
  }
}

async function hasValidReauthMaterial(): Promise<boolean> {
  try {
    const [identifier, secret, meta] = await Promise.all([
      SecureStore.getItemAsync(REAUTH_IDENTIFIER_KEY),
      SecureStore.getItemAsync(REAUTH_SECRET_KEY),
      readReauthMeta()
    ]);
    if (!identifier?.trim() || !secret || !meta) return false;
    if (meta.apiEnv !== apiEnvFingerprint()) {
      logBiometric("reauth_env_mismatch");
      await clearBiometricReauthMaterial("api_env_changed");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist Keystore-backed re-auth material after password login / enable.
 * Never logs the secret.
 */
export async function saveBiometricReauthMaterial(input: {
  identifier: string;
  secret: string;
  userId: number;
}): Promise<void> {
  const identifier = input.identifier.trim();
  const secret = input.secret;
  if (!identifier || !secret || !Number.isFinite(input.userId) || input.userId <= 0) {
    return;
  }
  await migrateLegacyBiometricPasswords();
  const meta: BiometricReauthMeta = {
    userId: input.userId,
    apiEnv: apiEnvFingerprint()
  };
  await SecureStore.setItemAsync(REAUTH_IDENTIFIER_KEY, identifier, SECURE_OPTS);
  await SecureStore.setItemAsync(REAUTH_SECRET_KEY, secret, SECURE_OPTS);
  await SecureStore.setItemAsync(REAUTH_META_KEY, JSON.stringify(meta), SECURE_OPTS);
  logBiometric("reauth_material_saved", { userId: input.userId });
}

export async function clearBiometricReauthMaterial(reason: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(REAUTH_IDENTIFIER_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(REAUTH_SECRET_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(REAUTH_META_KEY).catch(() => undefined)
  ]);
  logBiometric("reauth_material_cleared", { reason });
}

const EMPTY_BIOMETRIC_STATUS: BiometricLoginStatus = {
  hardwareAvailable: false,
  enrolled: false,
  enabled: false,
  label: "Biometrics",
  reauthMaterialReady: false
};

export async function getBiometricLoginStatus(): Promise<BiometricLoginStatus> {
  try {
    await migrateLegacyBiometricPasswords();
    const [hardwareAvailable, enrolled, enabledFlag, reauthMaterialReady] = await Promise.all([
      withTimeout(LocalAuthentication.hasHardwareAsync().catch(() => false), STARTUP_TIMEOUTS.biometricLookupMs, false, "hasHardwareAsync"),
      withTimeout(LocalAuthentication.isEnrolledAsync().catch(() => false), STARTUP_TIMEOUTS.biometricLookupMs, false, "isEnrolledAsync"),
      withTimeout(SecureStore.getItemAsync(ENABLED_KEY).catch(() => null), STARTUP_TIMEOUTS.biometricLookupMs, null, "biometric_enabled_flag"),
      withTimeout(hasValidReauthMaterial().catch(() => false), STARTUP_TIMEOUTS.biometricLookupMs, false, "biometric_reauth_ready")
    ]);

    const status = {
      hardwareAvailable: Boolean(hardwareAvailable),
      enrolled: Boolean(enrolled),
      enabled: enabledFlag === "1",
      label: await getBiometricTypeLabel(),
      reauthMaterialReady: Boolean(reauthMaterialReady)
    };
    logBiometric("capability_checked", {
      hardwareAvailable: status.hardwareAvailable,
      enrolled: status.enrolled,
      enabled: status.enabled,
      reauthMaterialReady: status.reauthMaterialReady
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

/** Which biometric path applies given current tokens + material. */
export async function resolveBiometricAction(): Promise<BiometricAction | null> {
  const status = await getBiometricLoginStatus();
  if (!status.hardwareAvailable || !status.enrolled || !status.enabled) {
    return null;
  }
  const refresh = await getRefreshToken();
  if (refresh) return "unlock_existing_session";
  if (status.reauthMaterialReady) return "reauthenticate_expired_session";
  return null;
}

/**
 * Fingerprint unlock when preference is on AND (refresh token OR re-auth material).
 */
export async function canUseBiometricLogin(): Promise<boolean> {
  try {
    return (await resolveBiometricAction()) != null;
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
 * Verify biometric once, persist enablement, optionally store re-auth material.
 */
export async function enableBiometricLoginWithVerification(credentials?: {
  identifier: string;
  secret: string;
  userId: number;
}): Promise<boolean> {
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
  if (!refresh && !credentials) {
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
    if (credentials) {
      await saveBiometricReauthMaterial(credentials);
    }
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
  if (code.includes("invalidat") || code === "unable_to_process") {
    return "key_invalidated";
  }
  return "authentication_failed";
}

export async function clearBiometricCredentialMaterial(reason: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ENABLED_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(PROMPT_DISMISSED_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_PASS_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_REAUTH_USER_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_REAUTH_PASS_KEY).catch(() => undefined),
    clearBiometricReauthMaterial(reason)
  ]);
  logBiometric("biometric_material_cleared", { reason });
}

async function runBiometricPrompt(promptMessage: string): Promise<BiometricUnlockOutcome | "ok"> {
  const auth = await withTimeout(
    LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false
    }),
    BIOMETRIC_PROMPT_MS,
    { success: false, error: "timeout" } as LocalAuthentication.LocalAuthenticationResult,
    "biometric_login_prompt"
  );
  if (!auth.success) {
    return mapLocalAuthError(auth.error);
  }
  return "ok";
}

async function unlockViaRefresh(): Promise<BiometricUnlockResult> {
  try {
    const { withoutSessionExpiredTeardown } = await import("./sessionExpired");
    const access = await withoutSessionExpiredTeardown(() => refreshAccessTokenOnce());
    if (access) {
      logBiometric("login_success", { via: "refresh", action: "unlock_existing_session" });
      return { ok: true, outcome: "success", action: "unlock_existing_session" };
    }
    return { ok: false, outcome: "token_refresh_failed", action: "unlock_existing_session" };
  } catch (err) {
    return mapRefreshError(err, "unlock_existing_session");
  }
}

async function unlockViaReauthLogin(): Promise<BiometricUnlockResult> {
  const [identifier, secret] = await Promise.all([
    SecureStore.getItemAsync(REAUTH_IDENTIFIER_KEY),
    SecureStore.getItemAsync(REAUTH_SECRET_KEY)
  ]);
  if (!identifier?.trim() || !secret) {
    await clearBiometricReauthMaterial("missing_on_relogin");
    return { ok: false, outcome: "reauth_material_missing", action: "reauthenticate_expired_session" };
  }

  try {
    const tokens = await loginRequest(identifier.trim(), secret);
    await saveTokens(tokens);
    logBiometric("login_success", { via: "reauth_login", action: "reauthenticate_expired_session" });
    return { ok: true, outcome: "success", action: "reauthenticate_expired_session" };
  } catch (err) {
    if (isNetworkError(err)) {
      return { ok: false, outcome: "network_error", action: "reauthenticate_expired_session" };
    }
    if (isServerError(err)) {
      return { ok: false, outcome: "server_error", action: "reauthenticate_expired_session" };
    }
    const code = err instanceof ApiRequestError ? err.code : "";
    if (code === "SESSION_REPLACED" || code === "DEVICE_SESSION_REQUIRED") {
      await clearBiometricCredentialMaterial(code);
      return { ok: false, outcome: "session_replaced", action: "reauthenticate_expired_session" };
    }
    if (code === "INVALID_CREDENTIALS" || isEmployeeInactiveCode(code)) {
      await clearBiometricReauthMaterial(code || "invalid_credentials");
      return {
        ok: false,
        outcome: isEmployeeInactiveCode(code) ? "reauth_material_invalid" : "reauth_material_invalid",
        action: "reauthenticate_expired_session"
      };
    }
    return { ok: false, outcome: "token_refresh_failed", action: "reauthenticate_expired_session" };
  }
}

function mapRefreshError(err: unknown, action: BiometricAction): BiometricUnlockResult {
  if (isNetworkError(err)) {
    return { ok: false, outcome: "network_error", action };
  }
  if (isServerError(err)) {
    return { ok: false, outcome: "server_error", action };
  }
  const code =
    err instanceof ApiRequestError
      ? err.code
      : err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code ?? "")
        : "";
  if (code === "AUTH_UNCERTAIN") {
    return { ok: false, outcome: "network_error", action };
  }
  if (code === "SESSION_REPLACED" || code === "DEVICE_SESSION_REQUIRED") {
    void clearBiometricCredentialMaterial(code || "session_replaced");
    return { ok: false, outcome: "session_replaced", action };
  }
  if (isEmployeeInactiveCode(code)) {
    // Preference stays; reauth cleared so fingerprint cannot bypass deactivated account.
    void clearBiometricReauthMaterial(code || "employee_inactive");
    return { ok: false, outcome: "reauth_material_invalid", action };
  }
  return { ok: false, outcome: "token_refresh_failed", action };
}

/**
 * Prompt biometrics, then either refresh (app-lock) or password-login via Keystore material.
 * Cancel / mismatch never clears tokens or biometric preference.
 */
export async function unlockSessionWithBiometrics(): Promise<BiometricUnlockResult> {
  if (biometricActionInFlight) {
    return biometricActionInFlight;
  }

  biometricActionInFlight = (async (): Promise<BiometricUnlockResult> => {
    await migrateLegacyBiometricPasswords();
    if (biometricPromptInProgress) {
      logBiometric("prompt_suppressed_duplicate", { source: "login" });
      return { ok: false, outcome: "prompt_busy" };
    }

    const action = await resolveBiometricAction();
    if (!action) {
      const enabled = await SecureStore.getItemAsync(ENABLED_KEY);
      if (enabled !== "1") return { ok: false, outcome: "not_enabled" };
      const refresh = await getRefreshToken();
      if (!refresh) return { ok: false, outcome: "reauth_material_missing" };
      return { ok: false, outcome: "not_enabled" };
    }

    const [hardwareAvailable, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync().catch(() => false),
      LocalAuthentication.isEnrolledAsync().catch(() => false)
    ]);
    if (!hardwareAvailable) {
      return { ok: false, outcome: "hardware_unavailable", action };
    }
    if (!enrolled) {
      await clearBiometricCredentialMaterial("not_enrolled_after_enable");
      return { ok: false, outcome: "key_invalidated", action };
    }

    biometricPromptInProgress = true;
    unlockAttemptedThisLaunch = true;
    logBiometric("prompt_started", { action });
    logBiometric("login_prompt_started", { action });
    try {
      const prompt =
        action === "unlock_existing_session"
          ? "Unlock your field workspace"
          : "Sign in with fingerprint";
      const promptResult = await runBiometricPrompt(prompt);
      if (promptResult !== "ok") {
        if (promptResult === "user_cancel" || promptResult === "timeout") {
          logBiometric("login_cancelled", { outcome: promptResult });
        } else {
          logBiometric("login_failed", { outcome: promptResult });
        }
        logBiometric("prompt_result", { outcome: promptResult, action });
        if (promptResult === "key_invalidated") {
          await clearBiometricCredentialMaterial("platform_key_invalidated");
        }
        return { ok: false, outcome: promptResult, action };
      }

      if (action === "unlock_existing_session") {
        const refreshResult = await unlockViaRefresh();
        if (
          refreshResult.ok ||
          (refreshResult.outcome !== "token_refresh_failed" &&
            refreshResult.outcome !== "no_refresh_token")
        ) {
          logBiometric("prompt_result", { outcome: refreshResult.outcome, action });
          return refreshResult;
        }
        // Refresh dead — same fingerprint gesture may still re-login via Keystore material.
        const status = await getBiometricLoginStatus();
        if (status.reauthMaterialReady) {
          logBiometric("login_refresh_fallback_reauth", { from: refreshResult.outcome });
          const reauth = await unlockViaReauthLogin();
          logBiometric("prompt_result", { outcome: reauth.outcome, action: reauth.action });
          return reauth;
        }
        logBiometric("prompt_result", { outcome: refreshResult.outcome, action });
        return refreshResult;
      }

      const result = await unlockViaReauthLogin();
      logBiometric("prompt_result", { outcome: result.outcome, action });
      return result;
    } finally {
      biometricPromptInProgress = false;
    }
  })();

  try {
    return await biometricActionInFlight;
  } finally {
    biometricActionInFlight = null;
  }
}

/** @deprecated Never returns credentials. */
export async function readBiometricCredentials(): Promise<null> {
  await migrateLegacyBiometricPasswords();
  return null;
}

export async function clearBiometricLogin(): Promise<void> {
  await clearBiometricCredentialMaterial("explicit_clear");
  logBiometric("enabled_flag_cleared");
}

/** @deprecated Use enableBiometricLoginWithVerification */
export async function saveBiometricLogin(): Promise<boolean> {
  return enableBiometricLoginWithVerification();
}

/** @deprecated Use enableBiometricLoginWithVerification */
export async function enableBiometricLogin(_username?: string, _password?: string): Promise<boolean> {
  return enableBiometricLoginWithVerification();
}
