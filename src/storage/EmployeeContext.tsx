import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Employee, getCurrentEmployee } from "../api/employees";
import { useAuth } from "./AuthContext";
import { useFieldDataRefresh } from "./FieldDataRefreshContext";
import { registerSessionTeardown } from "./sessionConflict";

type EmployeeContextValue = {
  employee: Employee | null;
  loading: boolean;
  error: string;
  refreshEmployee: () => Promise<Employee | null>;
};

const EmployeeContext = createContext<EmployeeContextValue | undefined>(undefined);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
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
      const message = err instanceof Error ? err.message : "Unable to load employee profile.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshEmployee().catch(() => undefined);
    } else {
      setEmployee(null);
      setError("");
    }
  }, [isAuthenticated, refreshEmployee]);

  useEffect(() => {
    if (!isAuthenticated || employeePhotoVersion <= 0) return;
    void refreshEmployee().catch(() => undefined);
  }, [employeePhotoVersion, isAuthenticated, refreshEmployee]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      void refreshEmployee().catch(() => undefined);
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshEmployee]);

  useEffect(() => {
    return registerSessionTeardown(() => {
      setEmployee(null);
      setError("");
    });
  }, []);

  const value = useMemo(
    () => ({ employee, loading, error, refreshEmployee }),
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
