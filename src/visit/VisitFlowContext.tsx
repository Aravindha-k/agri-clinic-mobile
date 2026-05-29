import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { VisitFormValues } from "../api/visits";
import { VisitFormPrefill } from "../utils/farmerPrefill";
import type { VisitFieldErrors, VisitValidationField } from "./visitValidation";
import type { PickedProfileImage } from "../utils/profileImagePick";
import { PendingVisitAttachment } from "./pendingAttachments";

export type VisitDraftMeta = {
  farmerDisplayName?: string;
  cropLabel?: string;
  villageLabel?: string;
  districtLabel?: string;
};

const emptyValues: VisitFormValues = {
  district: "",
  village: "",
  crop: "",
  land_name: "",
  land_area: "",
  farmer_id: "",
  farmer_name: "",
  farmer_phone: "",
  notes: "",
  crop_health: "",
  pest_issue: false,
  disease_issue: false,
  weed_condition: "",
  fertilizer_advice: "",
  pesticide_advice: "",
  irrigation_advice: "",
  general_advice: "",
  follow_up_required: false
};

type VisitFlowContextValue = {
  values: VisitFormValues;
  meta: VisitDraftMeta;
  pendingAttachments: PendingVisitAttachment[];
  pendingFarmerPhoto: PickedProfileImage | null;
  fieldErrors: VisitFieldErrors;
  setValues: React.Dispatch<React.SetStateAction<VisitFormValues>>;
  setMeta: React.Dispatch<React.SetStateAction<VisitDraftMeta>>;
  setFieldErrors: React.Dispatch<React.SetStateAction<VisitFieldErrors>>;
  addPendingAttachment: (item: PendingVisitAttachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  setPendingFarmerPhoto: (photo: PickedProfileImage | null) => void;
  clearPendingFarmerPhoto: () => void;
  clearFieldError: (field: VisitValidationField) => void;
  clearAllFieldErrors: () => void;
  applyPrefill: (prefill?: VisitFormPrefill, meta?: VisitDraftMeta) => void;
  beginVisit: (prefill?: VisitFormPrefill, meta?: VisitDraftMeta) => void;
  reset: () => void;
};

const VisitFlowContext = createContext<VisitFlowContextValue | undefined>(undefined);

export function VisitFlowProvider({ children }: { children: React.ReactNode }) {
  const [values, setValues] = useState<VisitFormValues>({ ...emptyValues });
  const [meta, setMeta] = useState<VisitDraftMeta>({});
  const [pendingAttachments, setPendingAttachments] = useState<PendingVisitAttachment[]>([]);
  const [pendingFarmerPhoto, setPendingFarmerPhotoState] = useState<PickedProfileImage | null>(null);
  const [fieldErrors, setFieldErrors] = useState<VisitFieldErrors>({});

  const clearFieldError = useCallback((field: VisitValidationField) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const addPendingAttachment = useCallback((item: PendingVisitAttachment) => {
    setPendingAttachments((current) => [item, ...current]);
  }, []);

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((current) => current.filter((a) => a.id !== id));
  }, []);

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  const setPendingFarmerPhoto = useCallback((photo: PickedProfileImage | null) => {
    setPendingFarmerPhotoState(photo);
  }, []);

  const clearPendingFarmerPhoto = useCallback(() => {
    setPendingFarmerPhotoState(null);
  }, []);

  const applyPrefill = useCallback((prefill?: VisitFormPrefill, nextMeta?: VisitDraftMeta) => {
    setValues({ ...emptyValues, ...prefill });
    setMeta(nextMeta ?? {});
    setFieldErrors({});
    setPendingAttachments([]);
    setPendingFarmerPhotoState(null);
  }, []);

  const beginVisit = useCallback((prefill?: VisitFormPrefill, nextMeta?: VisitDraftMeta) => {
    setValues({ ...emptyValues, ...(prefill ?? {}) });
    setMeta(nextMeta ?? {});
    setFieldErrors({});
    setPendingAttachments([]);
    setPendingFarmerPhotoState(null);
  }, []);

  const reset = useCallback(() => {
    setValues({ ...emptyValues });
    setMeta({});
    setFieldErrors({});
    setPendingAttachments([]);
    setPendingFarmerPhotoState(null);
  }, []);

  const ctx = useMemo(
    () => ({
      values,
      meta,
      pendingAttachments,
      pendingFarmerPhoto,
      fieldErrors,
      setValues,
      setMeta,
      setFieldErrors,
      addPendingAttachment,
      removePendingAttachment,
      clearPendingAttachments,
      setPendingFarmerPhoto,
      clearPendingFarmerPhoto,
      clearFieldError,
      clearAllFieldErrors,
      applyPrefill,
      beginVisit,
      reset
    }),
    [
      values,
      meta,
      pendingAttachments,
      pendingFarmerPhoto,
      fieldErrors,
      applyPrefill,
      beginVisit,
      reset,
      clearFieldError,
      clearAllFieldErrors,
      addPendingAttachment,
      removePendingAttachment,
      clearPendingAttachments,
      setPendingFarmerPhoto,
      clearPendingFarmerPhoto
    ]
  );

  return <VisitFlowContext.Provider value={ctx}>{children}</VisitFlowContext.Provider>;
}

export function useVisitFlow() {
  const ctx = useContext(VisitFlowContext);
  if (!ctx) {
    throw new Error("useVisitFlow must be used inside VisitFlowProvider");
  }
  return ctx;
}
