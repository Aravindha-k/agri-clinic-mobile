import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Employee } from "../api/employees";
import { useAuth, useAuthSessionReady } from "./AuthContext";
import { useFieldDataRefresh } from "./FieldDataRefreshContext";
import { registerSessionTeardown } from "./sessionConflict";
import { ApiRequestError, isAuthExpiredError, isNetworkError } from "../utils/apiError";
import { isDeviceSessionConflict } from "./sessionConflict";

type EmployeeContextValue = {
  employee: Employee | null;
  loading: boolean;
  employeeLoading: boolean;
  error: string;
  refreshEmployee: () => Promise<Employee | null>;
};

const EmployeeContext = createContext<EmployeeContextValue | undefined>(undefined);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, employee: authEmployee, refreshUser } = useAuth();
  const sessionReady = useAuthSessionReady();
  const { employeePhotoVersion } = useFieldDataRefresh();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshEmployee = useCallback(async () => {
    if (!isAuthenticated) {
      setError("");
      return null;
    }
    setLoading(true);
    try {
      setError("");
      const row = await refreshUser();
      return row;
    } catch (err) {
      if (isDeviceSessionConflict(err) || isAuthExpiredError(err)) {
        return null;
      }
      if (err instanceof ApiRequestError && (err.code === "AUTH_UNCERTAIN" || err.code === "DEVICE_SESSION_REQUIRED")) {
        setError("Profile will load when your connection improves.");
        return null;
      }
      const message = isNetworkError(err)
        ? "Profile will load when you are back online."
        : err instanceof Error
          ? err.message
          : "Unable to load employee profile.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, refreshUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      setError("");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!sessionReady || employeePhotoVersion <= 0) return;
    void refreshEmployee();
  }, [employeePhotoVersion, refreshEmployee, sessionReady]);

  useEffect(() => {
    return registerSessionTeardown(() => {
      setError("");
    });
  }, []);

  const value = useMemo(
    () => ({
      employee: authEmployee,
      loading,
      employeeLoading: loading,
      error,
      refreshEmployee
    }),
    [authEmployee, loading, error, refreshEmployee]
  );

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

export function useEmployee() {
  const value = useContext(EmployeeContext);
  if (!value) {
    throw new Error("useEmployee must be used inside EmployeeProvider");
  }
  return value;
}
