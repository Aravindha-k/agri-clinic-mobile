import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Employee, getCurrentEmployee } from "../api/employees";
import { useAuth, useAuthSessionReady } from "./AuthContext";
import { useFieldDataRefresh } from "./FieldDataRefreshContext";
import { registerSessionTeardown } from "./sessionConflict";
import { isAuthExpiredError, isNetworkError } from "../utils/apiError";
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
  const { isAuthenticated } = useAuth();
  const sessionReady = useAuthSessionReady();
  const { employeePhotoVersion } = useFieldDataRefresh();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshEmployee = useCallback(async () => {
    if (!isAuthenticated) {
      setEmployee(null);
      setError("");
      return null;
    }
    setLoading(true);
    try {
      setError("");
      const row = await getCurrentEmployee();
      setEmployee(row);
      return row;
    } catch (err) {
      if (isDeviceSessionConflict(err) || isAuthExpiredError(err)) {
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
  }, [isAuthenticated]);

  useEffect(() => {
    if (sessionReady) {
      void refreshEmployee();
    } else if (!isAuthenticated) {
      setEmployee(null);
      setError("");
    }
  }, [isAuthenticated, refreshEmployee, sessionReady]);

  useEffect(() => {
    if (!sessionReady || employeePhotoVersion <= 0) return;
    void refreshEmployee();
  }, [employeePhotoVersion, refreshEmployee, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    const interval = setInterval(() => {
      void refreshEmployee();
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshEmployee, sessionReady]);

  useEffect(() => {
    return registerSessionTeardown(() => {
      setEmployee(null);
      setError("");
    });
  }, []);

  const value = useMemo(
    () => ({
      employee,
      loading,
      employeeLoading: loading,
      error,
      refreshEmployee
    }),
    [employee, loading, error, refreshEmployee]
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
