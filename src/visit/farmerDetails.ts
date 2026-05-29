import type { VisitFormValues } from "../api/visits";
import { resolveFarmerPk } from "./resolveFarmerPk";

function coerceStr(value: unknown): string {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

export function phoneDigitCount(phone: unknown) {
  return coerceStr(phone).replace(/\D/g, "").length;
}

/** New farmer draft: no directory id, but name and/or phone entered. */
export function isNewFarmerDraft(values: VisitFormValues): boolean {
  if (resolveFarmerPk(values as Record<string, unknown>) != null) {
    return false;
  }
  return Boolean(coerceStr(values.farmer_name) || coerceStr(values.farmer_phone));
}

/** Enough to register a new farmer before visit submit. */
export function hasCompleteNewFarmerDetails(values: VisitFormValues): boolean {
  if (resolveFarmerPk(values as Record<string, unknown>) != null) {
    return false;
  }
  const name = coerceStr(values.farmer_name);
  return (
    name.length >= 2 &&
    phoneDigitCount(values.farmer_phone) >= 10 &&
    /^\d+$/.test(coerceStr(values.district)) &&
    /^\d+$/.test(coerceStr(values.village))
  );
}

export function canProceedFarmerStep(values: VisitFormValues): boolean {
  return resolveFarmerPk(values as Record<string, unknown>) != null || hasCompleteNewFarmerDetails(values);
}
