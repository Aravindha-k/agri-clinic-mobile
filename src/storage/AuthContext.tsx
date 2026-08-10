import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { loginRequest, logoutRequest } from "../api/auth";
import { Employee, getCurrentEmployee, isFieldEmployee } from "../api/employees";
import { clearInflightRequests } from "../api/requestDedupe";
import { clearMasterDataCache } from "./masterDataCache";
import { logApiTelemetrySummary, resetApiTelemetry } from "../api/apiTelemetry";
import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import {
  EMPLOYEE_INACTIVE_MESSAGE,
  bumpAuthTeardownEpoch,
  registerEmployeeInactiveTeardown
} from "./employeeInactive";
import { registerGoToLogin } from "./authRecovery";
import { clearDeviceSessionId, DEVICE_SESSION_STORAGE_ERROR, ensureDeviceSessionLoaded, getDeviceSessionId } from "./deviceSessionStorage";
import { registerSessionExpiredTeardown } from "./sessionExpired";
import { registerSessionTeardown } from "./sessionConflict";
import { runPreSignOutHandlers } from "./preSignOut";
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "./tokenStorage";
import {
  canUseBiometricLogin,
  clearBiometricLogin,
  clearBiometricReauthMaterial,
  getBiometricLoginStatus,
  resetBiometricUnlockAttemptThisLaunch,
  saveBiometricReauthMaterial,
  setPreferPasswordLoginThisSession,
  unlockSessionWithBiometrics,
  type BiometricUnlockResult
} from "./biometricLoginStorage";
import {
  getAuthPhase,
  setAuthPhase,
  type AuthPhase,
  canEnterAppShell
} from "./authPhase";
import { requestSplashReplay } from "../bootstrap/splashReplay";
import { ApiRequestError, isAuthExpiredError, isNetworkError, isServerError } from "../utils/apiError";
import { fetchMobileBootstrap } from "../features/duty/api/mobileBootstrapApi";
import { clearLocalFieldQueuesOnSessionReplace } from "./clearLocalFieldQueues";
import { clearDutyBootstrapState, hydrateDutyFromBootstrap } from "../features/duty/store/DutyContext";
import { isDeviceSessionConflict } from "./sessionConflict";
import { logStartup, patchStartupSnapshot } from "../utils/startupDiagnostics";
import { setActiveSyncUserId } from "../../mobile/lib/sync/queueOwnership";
import {
  STARTUP_TIMEOUTS,
  markAuthRestored,
  markBootstrapBegin,
  markBootstrapFailed,
  markBootstrapSuccess,
  markBootstrapTimeout,
  markStartupBegin,
  resetStartupCoordinator
} from "../bootstrap/startupCoordinator";

const FIELD_EMPLOYEE_ONLY_MESSAGE = "This app is only for field employees.";
const BOOTSTRAP_TIMEOUT_MS = STARTUP_TIMEOUTS.bootstrapNetworkMs;

export type BootstrapIssue = "none" | "network" | "server";

/** Which shell to keep visible while `validating_session` (no branded logo loader). */
export type SessionValidateUi = "login" | "biometric_lock" | "none";

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  authPhase: AuthPhase;
  authLoading: boolean;
  sessionValidating: boolean;
  /** UI shell during post-login / unlock bootstrap — never a second splash. */
  sessionValidateUi: SessionValidateUi;
  bootstrapIssue: BootstrapIssue;
  loginNotice: string | null;
  employee: Employee | null;
  clearLoginNotice: () => void;
  retryBootstrap: () => Promise<void>;
  resetLocalSession: (reason?: string) => Promise<void>;
  refreshUser: () => Promise<Employee | null>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Prompt biometrics while locked; does not clear tokens on cancel. */
  attemptBiometricUnlock: () => Promise<BiometricUnlockResult>;
  /** After successful biometric, validate session and enter app. */
  completeBiometricUnlock: () => Promise<void>;
  /** Intentionally leave lock screen for password login — tokens kept. */
  choosePasswordLogin: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Module-level single-flight for cold-start local bootstrap. */
let foregroundBootstrapPromise: Promise<void> | null = null;
let foregroundBootstrapGeneration = 0;

function isRetriableAuthError(err: unknown): boolean {
  if (isNetworkError(err) || isServerError(err)) return true;
  if (err instanceof ApiRequestError) {
    return err.code === "DEVICE_SESSION_REQUIRED";
  }
  return false;
}

/** Saved tokens from another backend (e.g. local vs Render) — re-login, not "server down". */
function shouldForceReLoginOnBootstrap(err: unknown): boolean {
  if (isAuthExpiredError(err)) return true;
  if (err instanceof ApiRequestError && (err.code === "EMPLOYEE_INACTIVE" || err.code === "ACCOUNT_DISABLED")) {
    return true;
  }
  if (err instanceof ApiRequestError && err.status === 401) {
    return (
      err.code === "AUTH_UNCERTAIN" ||
      err.code === "INVALID_CREDENTIALS" ||
      err.code === "SESSION_EXPIRED"
    );
  }
  return false;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authPhaseState, setAuthPhaseState] = useState<AuthPhase>(() => getAuthPhase());
  const [isReady, setIsReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionValidating, setSessionValidating] = useState(false);
  const [sessionValidateUi, setSessionValidateUi] = useState<SessionValidateUi>("none");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bootstrapIssue, setBootstrapIssue] = useState<BootstrapIssue>("none");
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const backgroundValidationPromiseRef = useRef<Promise<void> | null>(null);
  const autoValidateStartedRef = useRef(false);
  const validationGenerationRef = useRef(0);
  const employeeIdRef = useRef<number | null>(null);
  const bootstrapAttemptedRef = useRef(false);
  const sessionValidateUiRef = useRef<SessionValidateUi>("none");

  employeeIdRef.current = employee?.id ?? null;

  const applyPhase = useCallback(
    (phase: AuthPhase, detail?: string) => {
      setAuthPhase(phase, detail);
      setAuthPhaseState(phase);
      setIsAuthenticated(phase === "authenticated");
      setIsReady(phase !== "initializing");
      setAuthLoading(phase === "initializing");
      setSessionValidating(phase === "validating_session");
      if (phase !== "validating_session") {
        sessionValidateUiRef.current = "none";
        setSessionValidateUi("none");
      }
    },
    []
  );

  const invalidateBootstrap = useCallback(() => {
    validationGenerationRef.current += 1;
  }, []);

  const clearLoginNotice = useCallback(() => {
    setLoginNotice(null);
  }, []);

  const performLocalSignOut = useCallback(
    async (options?: { notice?: string | null; reason?: string; phase?: AuthPhase }) => {
      invalidateBootstrap();
      await clearTokens();
      await clearDeviceSessionId();
      await clearMasterDataCache().catch(() => undefined);
      await clearDutyBootstrapState({ userId: employeeIdRef.current, preserveCache: false }).catch(() => undefined);
      clearInflightRequests();
      resetApiTelemetry();
      setEmployee(null);
      setActiveSyncUserId(null);
      setBootstrapIssue("none");
      autoValidateStartedRef.current = false;
      const nextPhase: AuthPhase =
        options?.phase ?? (options?.reason === "session_replaced" ? "session_replaced" : "unauthenticated");
      applyPhase(nextPhase, options?.reason);
      if (options?.reason) {
        logStartup("session_cleared", options.reason);
      }
      if (options?.notice) {
        setLoginNotice(options.notice);
      }
    },
    [applyPhase, invalidateBootstrap]
  );

  const lockSessionForBiometric = useCallback(() => {
    // Keep tokens / device session / employee metadata — only gate UI + network.
    autoValidateStartedRef.current = false;
    applyPhase("locked", "biometric unlock required");
    logStartup("session_locked", "biometric unlock required");
  }, [applyPhase]);

  const refreshUser = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setEmployee(null);
      setActiveSyncUserId(null);
      return null;
    }
    const row = await getCurrentEmployee();
    setEmployee(row);
    setActiveSyncUserId(row?.id ?? null);
    return row;
  }, []);

  const forceSessionConflictLogout = useCallback(async () => {
    // Stop native GPS immediately on old device before clearing tokens/queues.
    const { stopTrackingBridge } = await import("./TrackingContext");
    await stopTrackingBridge().catch(() => undefined);
    try {
      await logoutRequest().catch(() => undefined);
    } finally {
      clearLocalFieldQueuesOnSessionReplace();
      await clearBiometricLogin().catch(() => undefined);
      await performLocalSignOut({
        notice: SESSION_REPLACED_MESSAGE,
        reason: "session_replaced",
        phase: "session_replaced"
      });
    }
  }, [performLocalSignOut]);

  const forceSessionExpiredLogout = useCallback(async () => {
    // Clear access/refresh/device-session. Keep biometric preference + Keystore re-auth
    // so Login can offer fingerprint re-login alongside password.
    await performLocalSignOut({
      notice: SESSION_EXPIRED_MESSAGE,
      reason: "session_expired",
      phase: "session_expired"
    });
  }, [performLocalSignOut]);

  const forceEmployeeInactiveLogout = useCallback(async () => {
    // Admin deactivated this employee: stop field work and drop revoked session material.
    // Keep biometric ENABLED preference — password login after reactivation reconnects Keystore.
    // Do NOT keep reauth material (would bypass / loop against revoked session).
    await runPreSignOutHandlers().catch(() => undefined);
    setPreferPasswordLoginThisSession(true);
    resetBiometricUnlockAttemptThisLaunch();
    clearLocalFieldQueuesOnSessionReplace();
    await clearBiometricReauthMaterial("employee_inactive").catch(() => undefined);
    await performLocalSignOut({
      notice: EMPLOYEE_INACTIVE_MESSAGE,
      reason: "employee_inactive",
      phase: "unauthenticated"
    });
  }, [performLocalSignOut]);

  useEffect(() => {
    return registerSessionTeardown(forceSessionConflictLogout);
  }, [forceSessionConflictLogout]);

  useEffect(() => {
    return registerSessionExpiredTeardown(forceSessionExpiredLogout);
  }, [forceSessionExpiredLogout]);

  useEffect(() => {
    return registerEmployeeInactiveTeardown(forceEmployeeInactiveLogout);
  }, [forceEmployeeInactiveLogout]);

  useEffect(() => {
    return registerGoToLogin(async () => {
      await performLocalSignOut();
    });
  }, [performLocalSignOut]);

  const validateSessionInBackground = useCallback(
    async (options?: { isRetry?: boolean }) => {
      // Never validate while locked / biometric in progress — that races Login/Home.
      const phase = getAuthPhase();
      if (phase === "locked" || phase === "authenticating_biometric" || phase === "initializing") {
        return;
      }
      if (phase !== "authenticated" && phase !== "validating_session") {
        return;
      }

      const generation = ++validationGenerationRef.current;
      const isStale = () => generation !== validationGenerationRef.current;

      const previousValidation = backgroundValidationPromiseRef.current;
      if (previousValidation) {
        await previousValidation;
        if (isStale()) return;
      }

      let settleValidation!: () => void;
      const activeValidation = new Promise<void>((resolve) => {
        settleValidation = resolve;
      });
      backgroundValidationPromiseRef.current = activeValidation;

      if (options?.isRetry) {
        setBootstrapIssue("none");
      }

      setSessionValidating(true);
      logStartup("auth_validate_background_start");
      markBootstrapBegin("background_validate");

      let endedIssue: BootstrapIssue = "none";

      try {
        const token = await getAccessToken();
        if (isStale() || !token) {
          return;
        }

        await ensureDeviceSessionLoaded();
        if (isStale()) return;

        if (!(await getDeviceSessionId())) {
          await performLocalSignOut({
            notice: "This device needs a fresh sign-in. Please log in again.",
            reason: "missing device session"
          });
          return;
        }

        try {
          const bootstrap = await withTimeout(
            fetchMobileBootstrap({ force: false }),
            BOOTSTRAP_TIMEOUT_MS,
            "Mobile bootstrap timed out."
          );
          const profile = bootstrap.user ?? (await getCurrentEmployee());
          if (isStale()) return;
          if (!isFieldEmployee(profile)) {
            try {
              await logoutRequest().catch(() => undefined);
            } finally {
              await performLocalSignOut({ notice: FIELD_EMPLOYEE_ONLY_MESSAGE, reason: "not_field_employee" });
            }
            return;
          }
          setEmployee(profile);
          setActiveSyncUserId(profile.id);
          await hydrateDutyFromBootstrap({ bootstrap, userId: profile.id });
          setBootstrapIssue("none");
          endedIssue = "none";
          if (getAuthPhase() !== "authenticated") {
            applyPhase("authenticated", "background_validate");
          }
          markBootstrapSuccess(`employee=${profile.id}`);
          logStartup("session_restored", `employee=${profile.id}`);
        } catch (err) {
          if (isStale()) return;
          if (isDeviceSessionConflict(err)) {
            return;
          }
          const timedOut = err instanceof Error && /timed out/i.test(err.message);
          if (timedOut) {
            markBootstrapTimeout(err.message);
          } else {
            markBootstrapFailed(err instanceof Error ? err.message : "bootstrap_failed");
          }
          if (shouldForceReLoginOnBootstrap(err)) {
            await performLocalSignOut({
              notice: "Session is not valid for this server. Please sign in again.",
              reason: "invalid session for server"
            });
            return;
          }
          if (isRetriableAuthError(err) || timedOut) {
            const issue = timedOut || isNetworkError(err) ? "network" : "server";
            await hydrateDutyFromBootstrap({
              bootstrap: null,
              userId: employeeIdRef.current,
              error: err
            }).catch(() => undefined);
            setBootstrapIssue(issue);
            endedIssue = issue;
            return;
          }
          setBootstrapIssue("server");
          endedIssue = "server";
        }
      } finally {
        if (!isStale()) {
          setSessionValidating(false);
          patchStartupSnapshot({ bootstrapIssue: endedIssue });
          logStartup("auth_validate_background_end", `issue=${endedIssue}`);
          if (__DEV__) {
            setTimeout(() => logApiTelemetrySummary(), 2500);
          }
        }
        if (backgroundValidationPromiseRef.current === activeValidation) {
          backgroundValidationPromiseRef.current = null;
        }
        settleValidation();
      }
    },
    [applyPhase, performLocalSignOut]
  );

  const runFastLocalBootstrap = useCallback(async () => {
    if (foregroundBootstrapPromise) {
      return foregroundBootstrapPromise;
    }

    const generation = ++foregroundBootstrapGeneration;
    const isStale = () => generation !== foregroundBootstrapGeneration;

    foregroundBootstrapPromise = (async () => {
      applyPhase("initializing", "auth_bootstrap_start");
      setBootstrapIssue("none");
      logStartup("auth_bootstrap_start");

      let endedPhase: AuthPhase = "unauthenticated";

      try {
        const token = await getAccessToken();
        if (isStale()) return;
        if (!token) {
          // SecureStore can flake — check refresh before treating as logged out.
          const refresh =
            (await getRefreshToken().catch(() => null)) ||
            (await getRefreshToken().catch(() => null));
          let canBioUnlock = false;
          try {
            canBioUnlock = await canUseBiometricLogin();
          } catch {
            canBioUnlock = false;
          }
          if (canBioUnlock) {
            // Fingerprint is enabled: use app-lock gate — never "Session expired" logout UX.
            await ensureDeviceSessionLoaded().catch(() => undefined);
            if (isStale()) return;
            lockSessionForBiometric();
            setLoginNotice(null);
            endedPhase = "locked";
            logStartup(
              "session_locked",
              refresh ? "no_access_refresh_present" : "no_access_reauth_material"
            );
            return;
          }
          endedPhase = "unauthenticated";
          applyPhase("unauthenticated", "no saved token");
          logStartup("session_cleared", "no saved token");
          return;
        }

        await ensureDeviceSessionLoaded().catch(() => undefined);
        if (isStale()) return;

        if (!(await getDeviceSessionId().catch(() => null))) {
          await performLocalSignOut({
            notice: "This device needs a fresh sign-in. Please log in again.",
            reason: "missing device session"
          }).catch(() => undefined);
          endedPhase = "unauthenticated";
          return;
        }

        let biometricLocked = false;
        try {
          biometricLocked = await canUseBiometricLogin();
        } catch {
          biometricLocked = false;
          logStartup("session_restored", "biometric check failed — continue without lock");
        }
        if (isStale()) return;

        if (biometricLocked) {
          lockSessionForBiometric();
          endedPhase = "locked";
          return;
        }

        // Saved session, biometric off — enter app then validate in background.
        endedPhase = "authenticated";
        applyPhase("authenticated", "token present — validating bootstrap");
        logStartup("session_restored", "token present — validating bootstrap");
      } catch (err) {
        if (isStale()) return;
        endedPhase = "unauthenticated";
        applyPhase("unauthenticated", "bootstrap_error");
        logStartup(
          "session_cleared",
          err instanceof Error ? `bootstrap_error:${err.message}` : "bootstrap_error"
        );
      } finally {
        if (!isStale()) {
          markAuthRestored(`phase=${endedPhase} authenticated=${endedPhase === "authenticated"}`);
          patchStartupSnapshot({
            authLoading: false,
            isReady: true,
            isAuthenticated: endedPhase === "authenticated",
            bootstrapIssue: "none"
          });
          logStartup("auth_bootstrap_end", `phase=${endedPhase} local=true`);
        }
      }
    })().finally(() => {
      if (foregroundBootstrapGeneration === generation) {
        foregroundBootstrapPromise = null;
      }
    });

    return foregroundBootstrapPromise;
  }, [applyPhase, lockSessionForBiometric, performLocalSignOut]);

  useEffect(() => {
    if (bootstrapAttemptedRef.current) return;
    bootstrapAttemptedRef.current = true;
    void runFastLocalBootstrap();
  }, [runFastLocalBootstrap]);

  useEffect(() => {
    if (!canEnterAppShell() || getAuthPhase() !== "authenticated") {
      return;
    }
    if (autoValidateStartedRef.current) return;
    autoValidateStartedRef.current = true;
    void validateSessionInBackground();
  }, [authPhaseState, isAuthenticated, validateSessionInBackground]);

  /** Hard ceiling: never leave RootNavigator on a blank View because a hung storage promise never settles. */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (getAuthPhase() !== "initializing") return;
      logStartup("auth_bootstrap_timeout", "AuthProvider hard ceiling — forcing unauthenticated ready");
      markAuthRestored("forced_after_timeout");
      applyPhase("unauthenticated", "forced_after_timeout");
    }, STARTUP_TIMEOUTS.authLocalMs);
    return () => clearTimeout(timer);
  }, [applyPhase]);

  useEffect(() => {
    if (getAuthPhase() !== "authenticated") return;
    const onAppState = (next: AppStateStatus) => {
      if (next === "active" && getAuthPhase() === "authenticated") {
        void validateSessionInBackground();
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [authPhaseState, validateSessionInBackground]);

  useEffect(() => {
    if (getAuthPhase() !== "authenticated") return;
    let wasOffline = false;
    return NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (wasOffline && online && getAuthPhase() === "authenticated") {
        void validateSessionInBackground();
      }
      wasOffline = !online;
    });
  }, [authPhaseState, validateSessionInBackground]);

  const retryBootstrap = useCallback(async () => {
    if (getAuthPhase() === "initializing" || getAuthPhase() === "locked") {
      await runFastLocalBootstrap();
      return;
    }
    await validateSessionInBackground({ isRetry: true });
  }, [runFastLocalBootstrap, validateSessionInBackground]);

  const resetLocalSession = useCallback(
    async (reason = "manual reset") => {
      await runPreSignOutHandlers().catch(() => undefined);
      await performLocalSignOut({ reason });
    },
    [performLocalSignOut]
  );

  const establishAuthenticatedSession = useCallback(
    async (options?: { validateUi?: SessionValidateUi }) => {
      const validateUi = options?.validateUi ?? sessionValidateUiRef.current ?? "none";
      sessionValidateUiRef.current = validateUi;
      setSessionValidateUi(validateUi);
      applyPhase("validating_session", "establish_session");
      await ensureDeviceSessionLoaded();

      if (!(await getDeviceSessionId())) {
        throw new Error(DEVICE_SESSION_STORAGE_ERROR);
      }

      try {
        markBootstrapBegin("establish_session");
        const bootstrap = await withTimeout(
          fetchMobileBootstrap({ force: true }),
          BOOTSTRAP_TIMEOUT_MS,
          "Mobile bootstrap timed out."
        );
        const profile = bootstrap.user ?? (await getCurrentEmployee());
        if (!isFieldEmployee(profile)) {
          try {
            await logoutRequest();
          } finally {
            await performLocalSignOut({ notice: FIELD_EMPLOYEE_ONLY_MESSAGE, reason: "not_field_employee" });
          }
          throw new Error(FIELD_EMPLOYEE_ONLY_MESSAGE);
        }
        setEmployee(profile);
        setActiveSyncUserId(profile.id);
        await hydrateDutyFromBootstrap({ bootstrap, userId: profile.id });
        setBootstrapIssue("none");
        autoValidateStartedRef.current = true;
        applyPhase("authenticated", `employee=${profile.id}`);
        markBootstrapSuccess(`employee=${profile.id}`);
      } catch (err) {
        if (isRetriableAuthError(err)) {
          await hydrateDutyFromBootstrap({
            bootstrap: null,
            userId: employeeIdRef.current,
            error: err
          }).catch(() => undefined);
          autoValidateStartedRef.current = true;
          applyPhase("authenticated", "offline_retriable");
          setBootstrapIssue(isNetworkError(err) ? "network" : "server");
          return;
        }
        throw err;
      }
    },
    [applyPhase, performLocalSignOut]
  );

  const signIn = useCallback(
    async (username: string, password: string) => {
      // Cancel any deferred session-expired teardown so it cannot wipe a fresh login.
      bumpAuthTeardownEpoch();
      setLoginNotice(null);
      setPreferPasswordLoginThisSession(false);
      applyPhase("authenticating_password", "password_login");
      // Fresh login after deactivate/reactivate — never reuse revoked refresh/DeviceSession.
      await clearTokens().catch(() => undefined);
      await clearDeviceSessionId().catch(() => undefined);
      const tokens = await loginRequest(username, password);
      await saveTokens(tokens);
      await establishAuthenticatedSession({ validateUi: "login" });
      // Keep fingerprint eligibility; refresh Keystore re-auth material when already enabled.
      try {
        const status = await getBiometricLoginStatus();
        if (status.enabled) {
          const userId = employeeIdRef.current;
          if (userId != null && userId > 0) {
            await saveBiometricReauthMaterial({
              identifier: username,
              secret: password,
              userId
            });
          }
          logStartup("biometric_reconnected", "password login refreshed reauth material");
        }
      } catch {
        // ignore
      }
    },
    [applyPhase, establishAuthenticatedSession]
  );

  const attemptBiometricUnlock = useCallback(async (): Promise<BiometricUnlockResult> => {
    const startedPhase = getAuthPhase();
    if (
      startedPhase !== "locked" &&
      startedPhase !== "authenticating_biometric" &&
      startedPhase !== "unauthenticated" &&
      startedPhase !== "session_expired"
    ) {
      return { ok: false, outcome: "not_enabled" };
    }
    if (startedPhase === "locked" || startedPhase === "authenticating_biometric") {
      applyPhase("authenticating_biometric", "prompt");
    }
    // session_expired / unauthenticated: stay on Login while the OS prompt is open.
    const result = await unlockSessionWithBiometrics();
    if (!result.ok) {
      if (
        result.outcome === "user_cancel" ||
        result.outcome === "authentication_failed" ||
        result.outcome === "lockout" ||
        result.outcome === "timeout" ||
        result.outcome === "prompt_busy"
      ) {
        // Cancel/fail — remain on lock or session-expired Login. No alarming clear.
        if (startedPhase === "session_expired") {
          applyPhase("session_expired", result.outcome);
        } else if (startedPhase === "unauthenticated") {
          applyPhase("unauthenticated", result.outcome);
        } else {
          applyPhase("locked", result.outcome);
        }
      } else if (
        result.outcome === "not_enrolled" ||
        result.outcome === "hardware_unavailable" ||
        result.outcome === "key_invalidated" ||
        result.outcome === "reauth_material_missing" ||
        result.outcome === "reauth_material_invalid"
      ) {
        setPreferPasswordLoginThisSession(true);
        applyPhase(
          startedPhase === "session_expired" ? "session_expired" : "unauthenticated",
          result.outcome
        );
      } else if (result.outcome === "network_error" || result.outcome === "server_error") {
        if (startedPhase === "session_expired") {
          applyPhase("session_expired", result.outcome);
        } else if (startedPhase === "unauthenticated") {
          applyPhase("unauthenticated", result.outcome);
        } else {
          applyPhase("locked", result.outcome);
        }
      } else if (result.outcome === "session_replaced") {
        setPreferPasswordLoginThisSession(true);
        await performLocalSignOut({
          notice: SESSION_REPLACED_MESSAGE,
          reason: "session_replaced",
          phase: "session_replaced"
        });
      } else if (result.outcome === "no_refresh_token" || result.outcome === "token_refresh_failed") {
        // Do not force a "session expired" logout when fingerprint can still re-login.
        const status = await getBiometricLoginStatus().catch(() => null);
        if (status?.enabled && status.reauthMaterialReady) {
          setPreferPasswordLoginThisSession(false);
          setLoginNotice(null);
          applyPhase("locked", "refresh_failed_reauth_available");
          logStartup("session_locked", "refresh_failed_reauth_available");
        } else if (status?.enabled) {
          // Preference on but Keystore material missing — password once reconnects fingerprint.
          setPreferPasswordLoginThisSession(true);
          await clearTokens().catch(() => undefined);
          applyPhase("unauthenticated", result.outcome);
          setLoginNotice(null);
          logStartup("session_cleared", "biometric_needs_password_reconnect");
        } else {
          setPreferPasswordLoginThisSession(false);
          await performLocalSignOut({
            notice: SESSION_EXPIRED_MESSAGE,
            reason:
              result.outcome === "token_refresh_failed"
                ? "refresh_rejected_after_biometric"
                : "no_refresh_after_biometric",
            phase: "session_expired"
          });
        }
      } else {
        applyPhase(
          startedPhase === "session_expired"
            ? "session_expired"
            : startedPhase === "unauthenticated"
              ? "unauthenticated"
              : "locked",
          result.outcome
        );
      }
    } else if (result.action === "reauthenticate_expired_session") {
      // Fresh login already stored tokens — bootstrap into the app (stay on Login).
      try {
        await establishAuthenticatedSession({ validateUi: "login" });
      } catch (err) {
        applyPhase("locked", "reauth_bootstrap_failed");
        logStartup(
          "session_locked",
          err instanceof Error ? `reauth_bootstrap_failed:${err.message}` : "reauth_bootstrap_failed"
        );
        return {
          ok: false,
          outcome: isNetworkError(err) ? "network_error" : "server_error",
          action: "reauthenticate_expired_session"
        };
      }
    }
    return result;
  }, [applyPhase, establishAuthenticatedSession, performLocalSignOut]);

  const completeBiometricUnlock = useCallback(async () => {
    await establishAuthenticatedSession({ validateUi: "biometric_lock" });
  }, [establishAuthenticatedSession]);

  const choosePasswordLogin = useCallback(() => {
    setPreferPasswordLoginThisSession(true);
    const phase = getAuthPhase();
    applyPhase(phase === "session_expired" ? "session_expired" : "unauthenticated", "password_fallback");
    logStartup("password_login_chosen", phase === "locked" ? "tokens retained" : "session_expired");
  }, [applyPhase]);

  const signOutInFlightRef = useRef<Promise<void> | null>(null);

  const signOut = useCallback(async () => {
    if (signOutInFlightRef.current) {
      return signOutInFlightRef.current;
    }
    signOutInFlightRef.current = (async () => {
      await runPreSignOutHandlers();

      // Explicit logout: revoke session + clear Keystore reauth so biometric cannot bypass.
      // Keep ENABLED preference — password login reconnects material for future reopen.
      setPreferPasswordLoginThisSession(true);
      resetBiometricUnlockAttemptThisLaunch();
      try {
        await logoutRequest();
      } finally {
        clearLocalFieldQueuesOnSessionReplace();
        await clearBiometricReauthMaterial("explicit_logout").catch(() => undefined);
        await performLocalSignOut({ reason: "explicit_logout" });
        resetStartupCoordinator();
        markStartupBegin("splash_replay");
        requestSplashReplay("sign_out");
        signOutInFlightRef.current = null;
      }
    })();
    return signOutInFlightRef.current;
  }, [performLocalSignOut]);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticated,
      authPhase: authPhaseState,
      authLoading,
      sessionValidating,
      sessionValidateUi,
      bootstrapIssue,
      loginNotice,
      employee,
      clearLoginNotice,
      retryBootstrap,
      resetLocalSession,
      refreshUser,
      signIn,
      signOut,
      attemptBiometricUnlock,
      completeBiometricUnlock,
      choosePasswordLogin
    }),
    [
      isReady,
      isAuthenticated,
      authPhaseState,
      authLoading,
      sessionValidating,
      sessionValidateUi,
      bootstrapIssue,
      loginNotice,
      employee,
      clearLoginNotice,
      retryBootstrap,
      resetLocalSession,
      refreshUser,
      signIn,
      signOut,
      attemptBiometricUnlock,
      completeBiometricUnlock,
      choosePasswordLogin
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be inside AuthProvider");
  }
  return value;
}

/** True when local token check passed — home may render; server validation may still run. */
export function useAuthSessionReady() {
  const { isReady, isAuthenticated, authPhase } = useAuth();
  return isReady && isAuthenticated && authPhase === "authenticated";
}
