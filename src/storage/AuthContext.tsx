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
import { saveBiometricLogin } from "./biometricLoginStorage";
import { ApiRequestError, isAuthExpiredError, isNetworkError, isServerError } from "../utils/apiError";
import { isDeviceSessionConflict } from "./sessionConflict";

const FIELD_EMPLOYEE_ONLY_MESSAGE = "This app is only for field employees.";

export type BootstrapIssue = "none" | "network" | "server";

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  bootstrapIssue: BootstrapIssue;
  loginNotice: string | null;
  employee: Employee | null;
  clearLoginNotice: () => void;
  retryBootstrap: () => Promise<void>;
  refreshUser: () => Promise<Employee | null>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bootstrapIssue, setBootstrapIssue] = useState<BootstrapIssue>("none");
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const bootstrapRunningRef = useRef(false);

  const clearLoginNotice = useCallback(() => {
    setLoginNotice(null);
  }, []);

  const performLocalSignOut = useCallback(async (options?: { notice?: string | null }) => {
    await clearTokens();
    await clearDeviceSessionId();
    await clearMasterDataCache().catch(() => undefined);
    clearInflightRequests();
    resetApiTelemetry();
    setEmployee(null);
    setIsAuthenticated(false);
    setBootstrapIssue("none");
    setIsReady(true);
    if (options?.notice) {
      setLoginNotice(options.notice);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setEmployee(null);
      return null;
    }
    const row = await getCurrentEmployee();
    setEmployee(row);
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

  const bootstrap = useCallback(async () => {
    if (bootstrapRunningRef.current) return;
    bootstrapRunningRef.current = true;
    setAuthLoading(true);
    setBootstrapIssue("none");

    try {
      const token = await getAccessToken();
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      await ensureDeviceSessionLoaded();

      if (!(await getDeviceSessionId())) {
        await performLocalSignOut({
          notice: "This device needs a fresh sign-in. Please log in again."
        });
        return;
      }

      try {
        const profile = await getCurrentEmployee();
        if (!isFieldEmployee(profile)) {
          try {
            await logoutRequest().catch(() => undefined);
          } finally {
            await performLocalSignOut({ notice: FIELD_EMPLOYEE_ONLY_MESSAGE });
          }
          return;
        }
        setEmployee(profile);
        setIsAuthenticated(true);
        setBootstrapIssue("none");
      } catch (err) {
        if (isDeviceSessionConflict(err)) {
          return;
        }
        if (shouldForceReLoginOnBootstrap(err)) {
          await performLocalSignOut({
            notice: "Session is not valid for this server. Please sign in again."
          });
          return;
        }
        if (isRetriableAuthError(err)) {
          setIsAuthenticated(true);
          setBootstrapIssue(isNetworkError(err) ? "network" : "server");
          return;
        }
        setIsAuthenticated(true);
        setBootstrapIssue("server");
      }
    } finally {
      setAuthLoading(false);
      setIsReady(true);
      bootstrapRunningRef.current = false;
      if (__DEV__) {
        setTimeout(() => logApiTelemetrySummary(), 2500);
      }
    }
  }, [forceSessionExpiredLogout, performLocalSignOut]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const retryBootstrap = useCallback(async () => {
    setAuthLoading(true);
    setBootstrapIssue("none");
    await bootstrap();
  }, [bootstrap]);

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
      await saveBiometricLogin(username, password).catch(() => undefined);
    },
    [establishAuthenticatedSession]
  );

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
      bootstrapIssue,
      loginNotice,
      employee,
      clearLoginNotice,
      retryBootstrap,
      refreshUser,
      signIn,
      signOut
    }),
    [
      isReady,
      isAuthenticated,
      authLoading,
      bootstrapIssue,
      loginNotice,
      employee,
      clearLoginNotice,
      retryBootstrap,
      refreshUser,
      signIn,
      signOut
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

/** True when auth bootstrap finished and there is no blocking startup issue. */
export function useAuthSessionReady() {
  const { isReady, isAuthenticated, bootstrapIssue } = useAuth();
  return isReady && isAuthenticated && bootstrapIssue === "none";
}
