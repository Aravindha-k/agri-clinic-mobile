import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loginRequest, logoutRequest } from "../api/auth";
import { Employee, getCurrentEmployee, isFieldEmployee } from "../api/employees";
import { clearInflightRequests } from "../api/requestDedupe";
import { clearMasterDataCache } from "./masterDataCache";
import { logApiTelemetrySummary, resetApiTelemetry } from "../api/apiTelemetry";
import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { registerGoToLogin } from "./authRecovery";
import { clearDeviceSessionId, DEVICE_SESSION_STORAGE_ERROR, ensureDeviceSessionLoaded, getDeviceSessionId } from "./deviceSessionStorage";
import { registerSessionExpiredTeardown } from "./sessionExpired";
import { registerSessionTeardown } from "./sessionConflict";
import { runPreSignOutHandlers } from "./preSignOut";
import { getAccessToken, saveTokens, clearTokens, type StoredTokens } from "./tokenStorage";
import { canUseBiometricLogin } from "./biometricLoginStorage";
import { ApiRequestError, isAuthExpiredError, isNetworkError, isServerError } from "../utils/apiError";
import { isDeviceSessionConflict } from "./sessionConflict";
import { logStartup, patchStartupSnapshot } from "../utils/startupDiagnostics";
import { setActiveSyncUserId } from "../../mobile/lib/sync/queueOwnership";

const FIELD_EMPLOYEE_ONLY_MESSAGE = "This app is only for field employees.";

export type BootstrapIssue = "none" | "network" | "server";

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  sessionValidating: boolean;
  bootstrapIssue: BootstrapIssue;
  loginNotice: string | null;
  employee: Employee | null;
  clearLoginNotice: () => void;
  retryBootstrap: () => Promise<void>;
  resetLocalSession: (reason?: string) => Promise<void>;
  refreshUser: () => Promise<Employee | null>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeBiometricUnlock: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  if (err instanceof ApiRequestError && err.status === 401) {
    return (
      err.code === "AUTH_UNCERTAIN" ||
      err.code === "INVALID_CREDENTIALS" ||
      err.code === "SESSION_EXPIRED"
    );
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionValidating, setSessionValidating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bootstrapIssue, setBootstrapIssue] = useState<BootstrapIssue>("none");
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const bootstrapRunningRef = useRef(false);
  const backgroundValidationPromiseRef = useRef<Promise<void> | null>(null);
  const autoValidateStartedRef = useRef(false);
  const validationGenerationRef = useRef(0);

  const invalidateBootstrap = useCallback(() => {
    validationGenerationRef.current += 1;
  }, []);

  const clearLoginNotice = useCallback(() => {
    setLoginNotice(null);
  }, []);

  const performLocalSignOut = useCallback(async (options?: { notice?: string | null; reason?: string }) => {
    invalidateBootstrap();
    await clearTokens();
    await clearDeviceSessionId();
    await clearMasterDataCache().catch(() => undefined);
    clearInflightRequests();
    resetApiTelemetry();
    setEmployee(null);
    setActiveSyncUserId(null);
    setIsAuthenticated(false);
    setBootstrapIssue("none");
    setSessionValidating(false);
    setAuthLoading(false);
    setIsReady(true);
    autoValidateStartedRef.current = false;
    if (options?.reason) {
      logStartup("session_cleared", options.reason);
    }
    if (options?.notice) {
      setLoginNotice(options.notice);
    }
  }, [invalidateBootstrap]);

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
    try {
      await logoutRequest().catch(() => undefined);
    } finally {
      await performLocalSignOut({ notice: SESSION_REPLACED_MESSAGE });
    }
  }, [performLocalSignOut]);

  const forceSessionExpiredLogout = useCallback(async () => {
    await performLocalSignOut({ notice: SESSION_EXPIRED_MESSAGE });
  }, [performLocalSignOut]);

  useEffect(() => {
    return registerSessionTeardown(forceSessionConflictLogout);
  }, [forceSessionConflictLogout]);

  useEffect(() => {
    return registerSessionExpiredTeardown(forceSessionExpiredLogout);
  }, [forceSessionExpiredLogout]);

  useEffect(() => {
    return registerGoToLogin(async () => {
      await performLocalSignOut();
    });
  }, [performLocalSignOut]);

  const validateSessionInBackground = useCallback(
    async (options?: { isRetry?: boolean }) => {
      const generation = ++validationGenerationRef.current;
      const isStale = () => generation !== validationGenerationRef.current;

      const previousValidation = backgroundValidationPromiseRef.current;
      if (previousValidation) {
        await previousValidation;
        // Only the newest request starts after the previous session's request
        // settles. This prevents a sign-in from being dropped by an old run.
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
            notice: "This device needs a fresh sign-in. Please log in again."
          });
          return;
        }

        try {
          const profile = await getCurrentEmployee();
          if (isStale()) return;
          if (!isFieldEmployee(profile)) {
            try {
              await logoutRequest().catch(() => undefined);
            } finally {
              await performLocalSignOut({ notice: FIELD_EMPLOYEE_ONLY_MESSAGE });
            }
            return;
          }
          setEmployee(profile);
          setActiveSyncUserId(profile.id);
          setBootstrapIssue("none");
          endedIssue = "none";
          logStartup("session_restored", `employee=${profile.id}`);
        } catch (err) {
          if (isStale()) return;
          if (isDeviceSessionConflict(err)) {
            return;
          }
          if (shouldForceReLoginOnBootstrap(err)) {
            await performLocalSignOut({
              notice: "Session is not valid for this server. Please sign in again.",
              reason: "invalid session for server"
            });
            return;
          }
          if (isRetriableAuthError(err)) {
            const issue = isNetworkError(err) ? "network" : "server";
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
    [performLocalSignOut]
  );

  const runFastLocalBootstrap = useCallback(async () => {
    if (bootstrapRunningRef.current) return;
    bootstrapRunningRef.current = true;

    setAuthLoading(true);
    setBootstrapIssue("none");
    logStartup("auth_bootstrap_start");

    let endedAuthenticated = false;

    try {
      const token = await getAccessToken();
      if (!token) {
        setIsAuthenticated(false);
        endedAuthenticated = false;
        logStartup("session_cleared", "no saved token");
        return;
      }

      await ensureDeviceSessionLoaded().catch(() => undefined);

      if (!(await getDeviceSessionId().catch(() => null))) {
        await performLocalSignOut({
          notice: "This device needs a fresh sign-in. Please log in again."
        }).catch(() => undefined);
        endedAuthenticated = false;
        return;
      }

      let biometricLocked = false;
      try {
        biometricLocked = await canUseBiometricLogin();
      } catch {
        biometricLocked = false;
        logStartup("session_restored", "biometric check failed — continue without lock");
      }
      if (biometricLocked) {
        setIsAuthenticated(false);
        endedAuthenticated = false;
        logStartup("session_cleared", "biometric unlock required");
        return;
      }

      setIsAuthenticated(true);
      endedAuthenticated = true;
      logStartup("session_restored", "token present — home unlocked");
    } catch (err) {
      setIsAuthenticated(false);
      endedAuthenticated = false;
      logStartup(
        "session_cleared",
        err instanceof Error ? `bootstrap_error:${err.message}` : "bootstrap_error"
      );
    } finally {
      setAuthLoading(false);
      setIsReady(true);
      bootstrapRunningRef.current = false;
      patchStartupSnapshot({
        authLoading: false,
        isReady: true,
        isAuthenticated: endedAuthenticated,
        bootstrapIssue: "none"
      });
      logStartup("auth_bootstrap_end", `authenticated=${endedAuthenticated} local=true`);
    }
  }, [performLocalSignOut]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      autoValidateStartedRef.current = false;
      return;
    }
    if (autoValidateStartedRef.current) return;
    autoValidateStartedRef.current = true;
    void validateSessionInBackground();
  }, [isAuthenticated, isReady, validateSessionInBackground]);

  useEffect(() => {
    void runFastLocalBootstrap();
  }, [runFastLocalBootstrap]);

  /** Hard ceiling: never leave RootNavigator on a blank View because a hung storage promise never settles. */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady((prev) => {
        if (prev) return prev;
        logStartup("auth_bootstrap_timeout", "AuthProvider hard ceiling — forcing isReady");
        setAuthLoading(false);
        return true;
      });
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const retryBootstrap = useCallback(async () => {
    if (!isReady) {
      await runFastLocalBootstrap();
      return;
    }
    await validateSessionInBackground({ isRetry: true });
  }, [isReady, runFastLocalBootstrap, validateSessionInBackground]);

  const resetLocalSession = useCallback(
    async (reason = "manual reset") => {
      await runPreSignOutHandlers().catch(() => undefined);
      await performLocalSignOut({ reason });
    },
    [performLocalSignOut]
  );

  const establishAuthenticatedSession = useCallback(async () => {
    await ensureDeviceSessionLoaded();

    if (!(await getDeviceSessionId())) {
      throw new Error(DEVICE_SESSION_STORAGE_ERROR);
    }

    try {
      const profile = await getCurrentEmployee();
      if (!isFieldEmployee(profile)) {
        try {
          await logoutRequest();
        } finally {
          await performLocalSignOut({ notice: FIELD_EMPLOYEE_ONLY_MESSAGE });
        }
        throw new Error(FIELD_EMPLOYEE_ONLY_MESSAGE);
      }
      setEmployee(profile);
      setActiveSyncUserId(profile.id);
      setBootstrapIssue("none");
      setIsAuthenticated(true);
      setIsReady(true);
    } catch (err) {
      if (isRetriableAuthError(err)) {
        setIsAuthenticated(true);
        setBootstrapIssue(isNetworkError(err) ? "network" : "server");
        setIsReady(true);
        return;
      }
      throw err;
    }
  }, [performLocalSignOut]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      setLoginNotice(null);
      const tokens = await loginRequest(username, password);
      await saveTokens(tokens);
      await establishAuthenticatedSession();
    },
    [establishAuthenticatedSession]
  );

  const completeBiometricUnlock = useCallback(async () => {
    await establishAuthenticatedSession();
  }, [establishAuthenticatedSession]);

  const signOut = useCallback(async () => {
    await runPreSignOutHandlers();
    try {
      await logoutRequest();
    } finally {
      await performLocalSignOut();
    }
  }, [performLocalSignOut]);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticated,
      authLoading,
      sessionValidating,
      bootstrapIssue,
      loginNotice,
      employee,
      clearLoginNotice,
      retryBootstrap,
      resetLocalSession,
      refreshUser,
      signIn,
      signOut,
      completeBiometricUnlock
    }),
    [
      isReady,
      isAuthenticated,
      authLoading,
      sessionValidating,
      bootstrapIssue,
      loginNotice,
      employee,
      clearLoginNotice,
      retryBootstrap,
      resetLocalSession,
      refreshUser,
      signIn,
      signOut,
      completeBiometricUnlock
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

/** True when local token check passed — home may render; server validation may still run. */
export function useAuthSessionReady() {
  const { isReady, isAuthenticated } = useAuth();
  return isReady && isAuthenticated;
}
