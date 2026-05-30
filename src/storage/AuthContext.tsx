import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { loginRequest, logoutRequest } from "../api/auth";
import { getCurrentEmployee, isFieldEmployee } from "../api/employees";
import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { registerGoToLogin } from "./authRecovery";
import { clearDeviceSessionId } from "./deviceSessionStorage";
import { registerSessionExpiredTeardown } from "./sessionExpired";
import { registerSessionTeardown } from "./sessionConflict";
import { getAccessToken, saveTokens, clearTokens } from "./tokenStorage";
import { isAuthExpiredError, isNetworkError, isServerError } from "../utils/apiError";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bootstrapIssue, setBootstrapIssue] = useState<BootstrapIssue>("none");
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const conflictAlertShownRef = useRef(false);
  const expiredAlertShownRef = useRef(false);
  const bootstrapRunningRef = useRef(false);

  const clearLoginNotice = useCallback(() => {
    setLoginNotice(null);
  }, []);

  const performLocalSignOut = useCallback(async (options?: { notice?: string | null }) => {
    await clearTokens();
    await clearDeviceSessionId();
    setIsAuthenticated(false);
    setBootstrapIssue("none");
    if (options?.notice) {
      setLoginNotice(options.notice);
    }
  }, []);

  const forceSessionConflictLogout = useCallback(async () => {
    try {
      await logoutRequest().catch(() => undefined);
    } finally {
      await performLocalSignOut({ notice: SESSION_REPLACED_MESSAGE });
      if (!conflictAlertShownRef.current) {
        conflictAlertShownRef.current = true;
        Alert.alert("Signed out", SESSION_REPLACED_MESSAGE);
      }
    }
  }, [performLocalSignOut]);

  const forceSessionExpiredLogout = useCallback(async () => {
    await performLocalSignOut({ notice: SESSION_EXPIRED_MESSAGE });
    if (!expiredAlertShownRef.current) {
      expiredAlertShownRef.current = true;
      Alert.alert("Session ended", SESSION_EXPIRED_MESSAGE);
    }
  }, [performLocalSignOut]);

  useEffect(() => {
    return registerSessionTeardown(forceSessionConflictLogout);
  }, [forceSessionConflictLogout]);

  useEffect(() => {
    return registerSessionExpiredTeardown(forceSessionExpiredLogout);
  }, [forceSessionExpiredLogout]);

  useEffect(() => {
    return registerGoToLogin(async () => {
      conflictAlertShownRef.current = false;
      expiredAlertShownRef.current = false;
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
        if (isNetworkError(err)) {
          setIsAuthenticated(true);
          setBootstrapIssue("network");
          return;
        }
        if (isServerError(err)) {
          setIsAuthenticated(true);
          setBootstrapIssue("server");
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
    setIsReady(false);
    setAuthLoading(true);
    await bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      conflictAlertShownRef.current = false;
      expiredAlertShownRef.current = false;
      setLoginNotice(null);
      const tokens = await loginRequest(username, password);
      await saveTokens(tokens);
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
        if (isNetworkError(err) || isServerError(err)) {
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
    conflictAlertShownRef.current = false;
    expiredAlertShownRef.current = false;
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
