import { normalizeCategoryCode } from "../../src/utils/problemItemFilter";

export type AdviceFieldKey =
  | "recommendation"
  | "actionTaken"
  | "fertilizerAdvice"
  | "pesticideAdvice"
  | "irrigationAdvice"
  | "generalAdvice";

export type AdviceSuggestions = Record<AdviceFieldKey, string>;

export const ADVICE_FIELD_LABELS: Record<AdviceFieldKey, string> = {
  recommendation: "Quick Recommendation",
  actionTaken: "Action Taken",
  fertilizerAdvice: "Fertilizer Advice",
  pesticideAdvice: "Pesticide Advice",
  irrigationAdvice: "Irrigation Advice",
  generalAdvice: "General Advice"
};

export const EMPTY_ADVICE_SUGGESTIONS: AdviceSuggestions = {
  recommendation: "",
  actionTaken: "",
  fertilizerAdvice: "",
  pesticideAdvice: "",
  irrigationAdvice: "",
  generalAdvice: ""
};

type AdviceState = AdviceSuggestions & {
  followUpRequired: boolean;
  followUpDate: string | null;
  nextVisitDate: string | null;
};

export function prominentAdviceFields(categoryCode: string): AdviceFieldKey[] {
  const code = normalizeCategoryCode(categoryCode);
  if (code === "pest" || code.includes("pest")) {
    return ["pesticideAdvice", "recommendation", "actionTaken"];
  }
  if (code === "nutrient" || code.includes("nutrient")) {
    return ["fertilizerAdvice", "recommendation"];
  }
  if (code === "disease" || code.includes("disease")) {
    return ["actionTaken", "pesticideAdvice", "recommendation"];
  }
  if (code === "water" || code.includes("water")) {
    return ["irrigationAdvice", "recommendation"];
  }
  return ["recommendation", "actionTaken"];
}

export function hasAnyAdvice(state: Pick<AdviceState, AdviceFieldKey>): boolean {
  return (
    Boolean(state.recommendation.trim()) ||
    Boolean(state.actionTaken.trim()) ||
    Boolean(state.fertilizerAdvice.trim()) ||
    Boolean(state.pesticideAdvice.trim()) ||
    Boolean(state.irrigationAdvice.trim()) ||
    Boolean(state.generalAdvice.trim())
  );
}

export function adviceSummaryLine(state: Pick<AdviceState, AdviceFieldKey>): string {
  const parts = [
    state.recommendation.trim(),
    state.actionTaken.trim(),
    state.fertilizerAdvice.trim(),
    state.pesticideAdvice.trim(),
    state.irrigationAdvice.trim(),
    state.generalAdvice.trim()
  ].filter(Boolean);
  return parts[0] ?? "";
}

export function validateAdviceStep(state: Pick<AdviceState, AdviceFieldKey>): { ok: boolean; message?: string } {
  if (!hasAnyAdvice(state)) {
    return { ok: false, message: "Please add recommendation or action taken." };
  }
  return { ok: true };
}

export function buildAdviceSuggestionsFromPrefill(values: {
  recommendation?: string;
  action_taken?: string;
  fertilizer_advice?: string;
  pesticide_advice?: string;
  irrigation_advice?: string;
  general_advice?: string;
}): AdviceSuggestions {
  return {
    recommendation: values.recommendation?.trim() || "",
    actionTaken: values.action_taken?.trim() || "",
    fertilizerAdvice: values.fertilizer_advice?.trim() || "",
    pesticideAdvice: values.pesticide_advice?.trim() || "",
    irrigationAdvice: values.irrigation_advice?.trim() || "",
    generalAdvice: values.general_advice?.trim() || ""
  };
}
