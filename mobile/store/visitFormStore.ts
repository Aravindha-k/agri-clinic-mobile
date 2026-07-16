import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { Farmer } from "../../src/api/farmers";
import type { ProblemCategory, ProblemItem } from "../../src/api/problems";
import type { LoadedRevisitPrefill } from "../../src/utils/farmerPrefill";
import {
  issueFlagsForCategory,
  isOtherCategory,
  OTHER_CATEGORY_CODE,
  resolveCategoryMeta
} from "../lib/problemCatalog";
import {
  buildAdviceSuggestionsFromPrefill,
  EMPTY_ADVICE_SUGGESTIONS,
  hasAnyAdvice,
  type AdviceFieldKey,
  type AdviceSuggestions
} from "../lib/visitAdvice";
import type { PendingVisitAttachment } from "../../src/visit/pendingAttachments";
import type { VisitPhotoAsset } from "../lib/visitPhotos";
import {
  getActiveSyncUserId,
  subscribeActiveSyncUserId
} from "../lib/sync/queueOwnership";
import { storage } from "../lib/storage";
import { generateLocalSyncId } from "../lib/sync/queueIds";

export type VisitGpsCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type NewFarmerDraft = {
  name: string;
  phone: string;
  district_id: string;
  village_id: string;
};

export type VisitSeverity = "low" | "medium" | "high";
export type VisitKind = "first" | "revisit";

export type RevisitContext = {
  cropLabel?: string;
  problemLabel?: string;
  recommendationLabel?: string;
};

type VisitFormState = {
  step: 1 | 2 | 3 | 4;
  farmer: Farmer | null;
  newFarmer: NewFarmerDraft | null;
  visitKind: VisitKind;
  gpsCoords: VisitGpsCoords | null;
  cropId: string;
  cropName: string;
  problemCategoryId: string;
  problemCategoryCode: string;
  problemMasterId: string;
  pendingProblemMasterId: string;
  selectedProblem: ProblemItem | null;
  otherProblemDescription: string;
  severity: VisitSeverity;
  pestIssue: boolean;
  diseaseIssue: boolean;
  followUpRequired: boolean;
  followUpDate: string | null;
  observation: string;
  fieldNotes: string;
  recommendation: string;
  actionTaken: string;
  fertilizerAdvice: string;
  pesticideAdvice: string;
  irrigationAdvice: string;
  generalAdvice: string;
  adviceSuggestions: AdviceSuggestions;
  revisitContext: RevisitContext | null;
  photos: VisitPhotoAsset[];
  extraAttachments: PendingVisitAttachment[];
  nextVisitDate: string | null;
  submissionLocalSyncId: string | null;
  visitedAt: string | null;
  draftUpdatedAt: string | null;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setFarmer: (farmer: Farmer | null) => void;
  setNewFarmer: (patch: Partial<NewFarmerDraft>) => void;
  clearNewFarmer: () => void;
  setGpsCoords: (coords: VisitGpsCoords) => void;
  setCrop: (cropId: string, cropName: string) => void;
  setProblemCategory: (id: string, code: string) => void;
  setProblemMaster: (item: ProblemItem | null) => void;
  selectProblemItem: (item: ProblemItem, categories: ProblemCategory[]) => void;
  selectManualOther: () => void;
  clearProblemSelection: () => void;
  setVisitKind: (kind: VisitKind) => void;
  setOtherProblemDescription: (value: string) => void;
  setSeverity: (severity: VisitSeverity) => void;
  setPestIssue: (value: boolean) => void;
  setDiseaseIssue: (value: boolean) => void;
  setFollowUpRequired: (value: boolean) => void;
  setFollowUpDate: (value: string | null) => void;
  setObservation: (value: string) => void;
  setFieldNotes: (value: string) => void;
  setAdviceField: (field: AdviceFieldKey, value: string) => void;
  setCombinedAdvice: (value: string) => void;
  addPhoto: (photo: VisitPhotoAsset) => void;
  removePhoto: (id: string) => void;
  addExtraAttachment: (attachment: PendingVisitAttachment) => void;
  removeExtraAttachment: (id: string) => void;
  clearExtraAttachments: () => void;
  setNextVisitDate: (value: string | null) => void;
  setSubmissionLocalSyncId: (value: string | null) => void;
  setVisitedAt: (value: string | null) => void;
  touchDraft: () => void;
  ensureLocalSyncId: () => string;
  applyRevisitPrefill: (loaded: LoadedRevisitPrefill) => void;
  hasFormData: () => boolean;
  reset: () => void;
};

const emptyNewFarmer = (): NewFarmerDraft => ({
  name: "",
  phone: "",
  district_id: "",
  village_id: ""
});

const initialStep2 = {
  cropId: "",
  cropName: "",
  problemCategoryId: "",
  problemCategoryCode: "",
  problemMasterId: "",
  pendingProblemMasterId: "",
  selectedProblem: null as ProblemItem | null,
  otherProblemDescription: "",
  severity: "medium" as VisitSeverity,
  pestIssue: false,
  diseaseIssue: false,
  followUpRequired: false,
  followUpDate: null as string | null,
  observation: "",
  fieldNotes: "",
  recommendation: "",
  actionTaken: "",
  fertilizerAdvice: "",
  pesticideAdvice: "",
  irrigationAdvice: "",
  generalAdvice: "",
  adviceSuggestions: { ...EMPTY_ADVICE_SUGGESTIONS },
  revisitContext: null as RevisitContext | null,
  photos: [] as VisitPhotoAsset[],
  extraAttachments: [] as PendingVisitAttachment[],
  nextVisitDate: null as string | null
};

const VISIT_DRAFT_KEY = "visit_form_draft_v2";

function scopedDraftKey(name: string): string | null {
  const userId = getActiveSyncUserId();
  return userId == null ? null : `${name}:user_${userId}`;
}

const userScopedDraftStorage: StateStorage = {
  getItem(name) {
    const key = scopedDraftKey(name);
    return key ? storage.getString(key) ?? null : null;
  },
  setItem(name, value) {
    const key = scopedDraftKey(name);
    if (key) storage.set(key, value);
  },
  removeItem(name) {
    const key = scopedDraftKey(name);
    if (key) storage.delete?.(key);
  }
};

export const useVisitFormStore = create<VisitFormState>()(
  persist(
    (set, get) => ({
  step: 1,
  farmer: null,
  newFarmer: null,
  visitKind: "first" as VisitKind,
  gpsCoords: null,
  submissionLocalSyncId: null,
  visitedAt: null,
  draftUpdatedAt: null,
  ...initialStep2,
  setStep: (step) => set({ step, draftUpdatedAt: new Date().toISOString() }),
  setFarmer: (farmer) =>
    set({
      farmer,
      newFarmer: farmer ? null : get().newFarmer
    }),
  setNewFarmer: (patch) =>
    set((state) => ({
      farmer: null,
      newFarmer: { ...(state.newFarmer ?? emptyNewFarmer()), ...patch }
    })),
  clearNewFarmer: () => set({ newFarmer: null }),
  setGpsCoords: (coords) => set({ gpsCoords: coords }),
  setCrop: (cropId, cropName) =>
    set({
      cropId,
      cropName,
      problemCategoryId: "",
      problemCategoryCode: "",
      problemMasterId: "",
      pendingProblemMasterId: "",
      selectedProblem: null,
      otherProblemDescription: "",
      pestIssue: false,
      diseaseIssue: false
    }),
  setProblemCategory: (problemCategoryId, problemCategoryCode) => {
    const flags = isOtherCategory(problemCategoryCode)
      ? { pestIssue: false, diseaseIssue: false }
      : issueFlagsForCategory(problemCategoryCode);
    set({
      problemCategoryId,
      problemCategoryCode,
      problemMasterId: "",
      pendingProblemMasterId: "",
      selectedProblem: null,
      otherProblemDescription: isOtherCategory(problemCategoryCode) ? get().otherProblemDescription : "",
      ...flags
    });
  },
  setProblemMaster: (item) =>
    set({
      selectedProblem: item,
      problemMasterId: item ? String(item.id) : "",
      pendingProblemMasterId: item ? String(item.id) : ""
    }),
  selectProblemItem: (item, categories) => {
    const meta = resolveCategoryMeta(item.category, categories);
    const flags = issueFlagsForCategory(meta.code);
    set({
      selectedProblem: item,
      problemMasterId: String(item.id),
      pendingProblemMasterId: String(item.id),
      problemCategoryId: meta.id,
      problemCategoryCode: meta.code,
      otherProblemDescription: "",
      ...flags
    });
  },
  selectManualOther: () =>
    set({
      problemCategoryId: OTHER_CATEGORY_CODE,
      problemCategoryCode: OTHER_CATEGORY_CODE,
      problemMasterId: "",
      pendingProblemMasterId: "",
      selectedProblem: null,
      pestIssue: false,
      diseaseIssue: false
    }),
  clearProblemSelection: () =>
    set({
      problemCategoryId: "",
      problemCategoryCode: "",
      problemMasterId: "",
      pendingProblemMasterId: "",
      selectedProblem: null,
      otherProblemDescription: "",
      pestIssue: false,
      diseaseIssue: false
    }),
  setVisitKind: (visitKind) => set({ visitKind }),
  setOtherProblemDescription: (otherProblemDescription) => set({ otherProblemDescription }),
  setSeverity: (severity) => set({ severity }),
  setPestIssue: (pestIssue) => set({ pestIssue }),
  setDiseaseIssue: (diseaseIssue) => set({ diseaseIssue }),
  setFollowUpRequired: (followUpRequired) =>
    set({
      followUpRequired,
      followUpDate: followUpRequired ? get().followUpDate : null
    }),
  setFollowUpDate: (followUpDate) => set({ followUpDate, nextVisitDate: followUpDate }),
  setObservation: (observation) => set({ observation }),
  setFieldNotes: (fieldNotes) => set({ fieldNotes }),
  setAdviceField: (field, value) => set({ [field]: value }),
  setCombinedAdvice: (value) => set({ recommendation: value, actionTaken: value }),
  addPhoto: (photo) =>
    set((state) => ({
      photos: state.photos.length >= 5 ? state.photos : [...state.photos, photo]
    })),
  removePhoto: (id) => set((state) => ({ photos: state.photos.filter((p) => p.id !== id) })),
  addExtraAttachment: (attachment) =>
    set((state) => ({
      extraAttachments: [...state.extraAttachments, attachment]
    })),
  removeExtraAttachment: (id) =>
    set((state) => ({
      extraAttachments: state.extraAttachments.filter((a) => a.id !== id)
    })),
  clearExtraAttachments: () => set({ extraAttachments: [] }),
  setNextVisitDate: (nextVisitDate) => set({ nextVisitDate, followUpDate: nextVisitDate }),
  setSubmissionLocalSyncId: (submissionLocalSyncId) => set({ submissionLocalSyncId }),
  setVisitedAt: (visitedAt) => set({ visitedAt, draftUpdatedAt: new Date().toISOString() }),
  touchDraft: () => set({ draftUpdatedAt: new Date().toISOString() }),
  ensureLocalSyncId: () => {
    const existing = get().submissionLocalSyncId;
    if (existing) return existing;
    const id = generateLocalSyncId();
    set({ submissionLocalSyncId: id, draftUpdatedAt: new Date().toISOString() });
    return id;
  },
  applyRevisitPrefill: (loaded) => {
    const values = loaded.values;
    const meta = loaded.meta;
    const problemMasterId = values.problem_master_id?.trim() || "";

    const categoryCode = values.problem_category_code?.trim() || "";
    const flags = issueFlagsForCategory(categoryCode);
    const suggestions = buildAdviceSuggestionsFromPrefill(values);
    const problemLabel =
      values.problem_seen?.trim() ||
      loaded.lastVisit?.field_visit?.problem_master?.name ||
      loaded.lastVisit?.field_visit?.problem_category?.name ||
      "";
    const recommendationLabel =
      values.recommendation?.trim() ||
      values.action_taken?.trim() ||
      values.general_advice?.trim() ||
      "";

    set({
      farmer: loaded.farmer,
      newFarmer: null,
      visitKind: "revisit",
      cropId: values.crop?.trim() || "",
      cropName: meta.cropLabel || values.crop_name?.trim() || "",
      problemCategoryId: values.problem_category_id?.trim() || "",
      problemCategoryCode: categoryCode,
      problemMasterId,
      pendingProblemMasterId: problemMasterId,
      selectedProblem: null,
      otherProblemDescription: "",
      ...flags,
      followUpRequired: false,
      followUpDate: null,
      nextVisitDate: null,
      observation: "",
      fieldNotes: "",
      recommendation: "",
      actionTaken: "",
      fertilizerAdvice: "",
      pesticideAdvice: "",
      irrigationAdvice: "",
      generalAdvice: "",
      adviceSuggestions: suggestions,
      revisitContext: {
        cropLabel: meta.cropLabel || values.crop_name?.trim() || undefined,
        problemLabel: problemLabel || undefined,
        recommendationLabel: recommendationLabel || undefined
      }
    });
  },
  hasFormData: () => {
    const state = get();
    if (state.farmer) return true;
    if (state.newFarmer) {
      const nf = state.newFarmer;
      if (nf.name.trim() || nf.phone.trim() || nf.district_id || nf.village_id) return true;
    }
    if (state.cropId || state.problemCategoryId || state.problemMasterId || state.otherProblemDescription.trim()) {
      return true;
    }
    if (state.observation.trim() || state.fieldNotes.trim() || state.photos.length || state.extraAttachments.length) {
      return true;
    }
    if (hasAnyAdvice(state)) return true;
    return false;
  },
  reset: () =>
    set({
      step: 1,
      farmer: null,
      newFarmer: null,
      visitKind: "first",
      gpsCoords: null,
      submissionLocalSyncId: null,
      visitedAt: null,
      draftUpdatedAt: null,
      ...initialStep2
    })
    }),
    {
      name: VISIT_DRAFT_KEY,
      storage: createJSONStorage(() => userScopedDraftStorage),
      skipHydration: true,
      partialize: (state) => ({
        step: state.step,
        farmer: state.farmer,
        newFarmer: state.newFarmer,
        visitKind: state.visitKind,
        gpsCoords: state.gpsCoords,
        cropId: state.cropId,
        cropName: state.cropName,
        problemCategoryId: state.problemCategoryId,
        problemCategoryCode: state.problemCategoryCode,
        problemMasterId: state.problemMasterId,
        pendingProblemMasterId: state.pendingProblemMasterId,
        selectedProblem: state.selectedProblem,
        otherProblemDescription: state.otherProblemDescription,
        severity: state.severity,
        pestIssue: state.pestIssue,
        diseaseIssue: state.diseaseIssue,
        followUpRequired: state.followUpRequired,
        followUpDate: state.followUpDate,
        observation: state.observation,
        fieldNotes: state.fieldNotes,
        recommendation: state.recommendation,
        actionTaken: state.actionTaken,
        fertilizerAdvice: state.fertilizerAdvice,
        pesticideAdvice: state.pesticideAdvice,
        irrigationAdvice: state.irrigationAdvice,
        generalAdvice: state.generalAdvice,
        adviceSuggestions: state.adviceSuggestions,
        revisitContext: state.revisitContext,
        photos: state.photos,
        extraAttachments: state.extraAttachments,
        nextVisitDate: state.nextVisitDate,
        submissionLocalSyncId: state.submissionLocalSyncId,
        visitedAt: state.visitedAt,
        draftUpdatedAt: state.draftUpdatedAt
      })
    }
  )
);

let draftSessionGeneration = 0;

/**
 * The Zustand store is process-global, so changing the storage key alone is
 * insufficient: the previous employee's live state would remain in memory.
 * Snapshot the incoming user's persisted value before reset (reset itself is
 * persisted), then restore and hydrate only that user's scoped draft.
 */
export function rehydrateVisitDraftForActiveUser(userId: number | null): Promise<void> {
  const generation = ++draftSessionGeneration;
  const targetKey = userId == null ? null : `${VISIT_DRAFT_KEY}:user_${userId}`;
  const persistedTarget = targetKey ? storage.getString(targetKey) : undefined;

  useVisitFormStore.getState().reset();

  if (!targetKey) {
    return Promise.resolve();
  }
  if (persistedTarget == null) {
    storage.delete?.(targetKey);
  } else {
    storage.set(targetKey, persistedTarget);
  }

  return Promise.resolve(useVisitFormStore.persist.rehydrate()).then(() => {
    if (generation !== draftSessionGeneration) {
      return;
    }
    const state = useVisitFormStore.getState();
    if (state.hasFormData() || state.step > 1) {
      state.ensureLocalSyncId();
    }
  });
}

subscribeActiveSyncUserId((userId) => {
  void rehydrateVisitDraftForActiveUser(userId);
});

export function farmerDisplayName(farmer: Farmer | null, newFarmer: NewFarmerDraft | null) {
  return farmer?.name?.trim() || newFarmer?.name?.trim() || "Farmer";
}
