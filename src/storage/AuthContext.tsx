import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loginRequest, logoutRequest } from "../api/auth";
import { getCurrentEmployee, isFieldEmployee } from "../api/employees";
import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { registerGoToLogin } from "./authRecovery";
import { clearDeviceSessionId, ensureDeviceSessionLoaded, getDeviceSessionId } from "./deviceSessionStorage";
import { registerSessionExpiredTeardown } from "./sessionExpired";
import { registerSessionTeardown } from "./sessionConflict";
import { getAccessToken, saveTokens, clearTokens } from "./tokenStorage";
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
  clearLoginNotice: () => void;
  retryBootstrap: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isRetriableAuthError(err: unknown): boolean {
  if (isNetworkError(err) || isServerError(err)) return true;
  if (err instanceof ApiRequestError) {
    return err.code === "AUTH_UNCERTAIN" || err.code === "DEVICE_SESSION_REQUIRED";
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bootstrapIssue, setBootstrapIssue] = useState<BootstrapIssue>("none");
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const bootstrapRunningRef = useRef(false);

  const clearLoginNotice = useCallback(() => {
    setLoginNotice(null);
  }, []);

  const performLocalSignOut = useCallback(async (options?: { notice?: string | null }) => {
    await clearTokens();
    await clearDeviceSessionId();
    setIsAuthenticated(false);
    setBootstrapIssue("none");
    setIsReady(true);
    if (options?.notice) {
      setLoginNotice(options.notice);
    }
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

      try {
        const employee = await getCurrentEmployee();
        if (!isFieldEmployee(employee)) {
          try {
            await logoutRequest().catch(() => undefined);
          } finally {
            await performLocalSignOut({ notice: FIELD_EMPLOYEE_ONLY_MESSAGE });
          }
          return;
        }
        setIsAuthenticated(true);
        setBootstrapIssue("none");
      } catch (err) {
        if (isDeviceSessionConflict(err)) {
          return;
        }
        if (isAuthExpiredError(err)) {
          await forceSessionExpiredLogout();
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

  const signIn = useCallback(
    async (username: string, password: string) => {
      setLoginNotice(null);
      const tokens = await loginRequest(username, password);
      await saveTokens(tokens);
      await ensureDeviceSessionLoaded();

      if (!(await getDeviceSessionId())) {
        throw new Error("Login succeeded but device session was not saved. Please try again.");
      }

      try {
        const employee = await getCurrentEmployee();
        if (!isFieldEmployee(employee)) {
          try {
            await logoutRequest();
          } finally {
            await performLocalSignOut({ notice: FIELD_EMPLOYEE_ONLY_MESSAGE });
          }
          throw new Error(FIELD_EMPLOYEE_ONLY_MESSAGE);
        }
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
    },
    [performLocalSignOut]
  );

  const signOut = useCallback(async () => {
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
      clearLoginNotice,
      retryBootstrap,
      signIn,
      signOut
    }),
    [
      isReady,
      isAuthenticated,
      authLoading,
      bootstrapIssue,
      loginNotice,
      clearLoginNotice,
      retryBootstrap,
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
