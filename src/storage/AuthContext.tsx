import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { loginRequest, logoutRequest } from "../api/auth";
import { getCurrentEmployee, isFieldEmployee } from "../api/employees";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { registerSessionTeardown } from "./sessionConflict";
import { clearDeviceSessionId } from "./deviceSessionStorage";
import { getAccessToken, saveTokens, clearTokens } from "./tokenStorage";

const FIELD_EMPLOYEE_ONLY_MESSAGE = "This app is only for field employees.";

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const conflictAlertShownRef = useRef(false);

  const forceSessionConflictLogout = useCallback(async () => {
    try {
      await logoutRequest().catch(() => undefined);
    } finally {
      await clearTokens();
      await clearDeviceSessionId();
      setIsAuthenticated(false);
      if (!conflictAlertShownRef.current) {
        conflictAlertShownRef.current = true;
        Alert.alert("Signed out", SESSION_REPLACED_MESSAGE);
      }
    }
  }, []);

  useEffect(() => {
    return registerSessionTeardown(forceSessionConflictLogout);
  }, [forceSessionConflictLogout]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsReady(true);
        }
        return;
      }

      if (!cancelled) {
        setIsAuthenticated(true);
        setIsReady(true);
      }

      try {
        const employee = await getCurrentEmployee();
        if (cancelled) return;
        if (!isFieldEmployee(employee)) {
          await clearTokens();
          await clearDeviceSessionId();
          setIsAuthenticated(false);
        }
      } catch {
        if (!cancelled) {
          await clearTokens();
          await clearDeviceSessionId();
          setIsAuthenticated(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    conflictAlertShownRef.current = false;
    const tokens = await loginRequest(username, password);
    await saveTokens(tokens);
    const employee = await getCurrentEmployee();
    if (!isFieldEmployee(employee)) {
      try {
        await logoutRequest();
      } finally {
        await clearTokens();
        await clearDeviceSessionId();
      }
      throw new Error(FIELD_EMPLOYEE_ONLY_MESSAGE);
    }
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      await clearTokens();
      await clearDeviceSessionId();
      setIsAuthenticated(false);
    }
  }, []);

  const value = useMemo(
    () => ({ isReady, isAuthenticated, signIn, signOut }),
    [isReady, isAuthenticated, signIn, signOut]
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
