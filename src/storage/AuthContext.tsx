import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loginRequest, logoutRequest } from "../api/auth";
import { getCurrentEmployee, isFieldEmployee } from "../api/employees";
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

      // Show UI quickly when a token exists; validate employee in background.
      if (!cancelled) {
        setIsAuthenticated(true);
        setIsReady(true);
      }

      try {
        const employee = await getCurrentEmployee();
        if (cancelled) return;
        if (!isFieldEmployee(employee)) {
          await clearTokens();
          setIsAuthenticated(false);
        }
      } catch {
        if (!cancelled) {
          await clearTokens();
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
    const tokens = await loginRequest(username, password);
    await saveTokens(tokens);
    const employee = await getCurrentEmployee();
    if (!isFieldEmployee(employee)) {
      try {
        await logoutRequest();
      } finally {
        await clearTokens();
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
