import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type FieldDataRefreshContextValue = {
  visitsVersion: number;
  farmersVersion: number;
  employeePhotoVersion: number;
  /** Call after visit create/update/complete so lists reload without app restart. */
  bumpAfterVisitChange: () => void;
  bumpAfterFarmerPhotoChange: () => void;
  bumpAfterEmployeePhotoChange: () => void;
};

const FieldDataRefreshContext = createContext<FieldDataRefreshContextValue | undefined>(undefined);

export function FieldDataRefreshProvider({ children }: { children: React.ReactNode }) {
  const [visitsVersion, setVisitsVersion] = useState(0);
  const [farmersVersion, setFarmersVersion] = useState(0);
  const [employeePhotoVersion, setEmployeePhotoVersion] = useState(0);

  const bumpAfterVisitChange = useCallback(() => {
    setVisitsVersion((v) => v + 1);
    setFarmersVersion((v) => v + 1);
  }, []);

  const bumpAfterFarmerPhotoChange = useCallback(() => {
    setFarmersVersion((v) => v + 1);
  }, []);

  const bumpAfterEmployeePhotoChange = useCallback(() => {
    setEmployeePhotoVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({
      visitsVersion,
      farmersVersion,
      employeePhotoVersion,
      bumpAfterVisitChange,
      bumpAfterFarmerPhotoChange,
      bumpAfterEmployeePhotoChange
    }),
    [
      visitsVersion,
      farmersVersion,
      employeePhotoVersion,
      bumpAfterVisitChange,
      bumpAfterFarmerPhotoChange,
      bumpAfterEmployeePhotoChange
    ]
  );

  return <FieldDataRefreshContext.Provider value={value}>{children}</FieldDataRefreshContext.Provider>;
}

export function useFieldDataRefresh() {
  const ctx = useContext(FieldDataRefreshContext);
  if (!ctx) {
    throw new Error("useFieldDataRefresh must be used inside FieldDataRefreshProvider");
  }
  return ctx;
}
