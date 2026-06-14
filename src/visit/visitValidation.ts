import type { VisitFormValues } from "../api/visits";
import { normalizeMobileVisitSubmitPayload } from "../utils/format";
import { canProceedFarmerStep, hasCompleteNewFarmerDetails } from "./farmerDetails";
import { resolveFarmerPk } from "./resolveFarmerPk";

export type VisitValidationField = "farmer" | "district" | "village" | "crop" | "gps" | "observation";

export type VisitValidationIssue = {
  field: VisitValidationField;
  message: string;
  step: "farmer" | "details" | "summary";
};

export type VisitFieldErrors = Partial<Record<VisitValidationField, string>>;

/** Coerce form values (string | number) for validation. */
export function coerceStr(value: unknown): string {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function isNumericId(value: unknown) {
  return /^\d+$/.test(coerceStr(value));
}

export function normalizeVisitGpsFields<T extends Pick<VisitFormValues, "latitude" | "longitude">>(values: T): T {
  const latitude = coerceStr(values.latitude);
  const longitude = coerceStr(values.longitude);
  return {
    ...values,
    latitude: latitude || undefined,
    longitude: longitude || undefined
  };
}

export function hasValidFarmer(values: VisitFormValues): boolean {
  return canProceedFarmerStep(values);
}

export function hasValidCrop(values: VisitFormValues): boolean {
  return isNumericId(values.crop);
}

export function hasValidGps(values: VisitFormValues): boolean {
  const lat = coerceStr(values.latitude);
  const lng = coerceStr(values.longitude);
  if (!lat || !lng) {
    return false;
  }
  const latN = Number(lat);
  const lngN = Number(lng);
  return Number.isFinite(latN) && Number.isFinite(lngN);
}

export function hasObservation(values: VisitFormValues): boolean {
  return (
    Boolean(coerceStr(values.observation)) ||
    Boolean(coerceStr(values.field_notes)) ||
    Boolean(coerceStr(values.problem_seen)) ||
    Boolean(coerceStr(values.problem_description)) ||
    Boolean(coerceStr(values.problem_master_id)) ||
    Boolean(coerceStr(values.action_taken)) ||
    Boolean(coerceStr(values.crop_health)) ||
    Boolean(coerceStr(values.weed_condition)) ||
    values.pest_issue === true ||
    values.disease_issue === true ||
    Boolean(coerceStr(values.general_advice)) ||
    Boolean(coerceStr(values.notes)) ||
    Boolean(coerceStr(values.fertilizer_advice)) ||
    Boolean(coerceStr(values.pesticide_advice)) ||
    Boolean(coerceStr(values.irrigation_advice))
  );
}

export function issuesToFieldErrors(issues: VisitValidationIssue[]): VisitFieldErrors {
  const map: VisitFieldErrors = {};
  for (const issue of issues) {
    if (!map[issue.field]) {
      map[issue.field] = issue.message;
    }
  }
  return map;
}

export function getFarmerStepIssues(values: VisitFormValues): VisitValidationIssue[] {
  const issues: VisitValidationIssue[] = [];
  if (!canProceedFarmerStep(values)) {
    const linked = resolveFarmerPk(values as Record<string, unknown>) != null;
    if (!linked && !hasCompleteNewFarmerDetails(values)) {
      const name = coerceStr(values.farmer_name);
      const phoneLen = coerceStr(values.farmer_phone).replace(/\D/g, "").length;
      if (!name) {
        issues.push({ field: "farmer", message: "Farmer name is required", step: "farmer" });
      } else if (phoneLen < 10) {
        issues.push({ field: "farmer", message: "Enter a valid 10-digit mobile number", step: "farmer" });
      } else {
        issues.push({
          field: "farmer",
          message: "Choose an existing farmer or enter new farmer details",
          step: "farmer"
        });
      }
    } else {
      issues.push({ field: "farmer", message: "Farmer is required", step: "farmer" });
    }
  }
  if (!isNumericId(values.district)) {
    issues.push({ field: "district", message: "District is required", step: "farmer" });
  }
  if (!isNumericId(values.village)) {
    issues.push({ field: "village", message: "Village is required", step: "farmer" });
  }
  return issues;
}

export function getDetailsStepIssues(values: VisitFormValues): VisitValidationIssue[] {
  const normalized = normalizeVisitGpsFields(values);
  const issues: VisitValidationIssue[] = [];
  if (!hasValidCrop(normalized)) {
    issues.push({ field: "crop", message: "Crop is required", step: "details" });
  }
  if (!hasObservation(normalized)) {
    issues.push({
      field: "observation",
      message: "Add observation / field notes, problem seen, or action taken",
      step: "details"
    });
  }
  if (!hasValidGps(normalized)) {
    issues.push({ field: "gps", message: "GPS location is required", step: "details" });
  }
  return issues;
}

/** Validates against normalized POST payload (farmer, crop, lat/lng, observation). */
export function getSubmitIssues(values: VisitFormValues): VisitValidationIssue[] {
  const normalized = normalizeVisitGpsFields(values);
  const issues: VisitValidationIssue[] = [];
  const payload = normalizeMobileVisitSubmitPayload(normalized as Record<string, unknown>);

  const farmerPk = resolveFarmerPk(normalized as Record<string, unknown>);
  const hasFarmerPayload = payload.farmer != null && payload.farmer !== "";
  if (!hasFarmerPayload || farmerPk == null) {
    issues.push({
      field: "farmer",
      message: hasCompleteNewFarmerDetails(normalized)
        ? "Farmer could not be registered — check mobile number and try again"
        : "Select an existing farmer or enter new farmer name and mobile",
      step: "farmer"
    });
  }

  const crop = payload.crop;
  const cropOk =
    crop != null &&
    crop !== "" &&
    (typeof crop === "number" ? Number.isFinite(crop) : isNumericId(crop));
  if (!cropOk) {
    issues.push({ field: "crop", message: "Crop is required", step: "details" });
  }

  const lat = payload.latitude;
  const lng = payload.longitude;
  const gpsOk =
    lat != null &&
    lng != null &&
    lat !== "" &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));
  if (!gpsOk) {
    issues.push({ field: "gps", message: "GPS location is required", step: "summary" });
  }

  if (!hasObservation(normalized)) {
    issues.push({
      field: "observation",
      message: "Observation / field notes or action details are required",
      step: "details"
    });
  }

  return issues;
}

export function getSubmitSummaryLines(issues: VisitValidationIssue[]): string[] {
  const lines: string[] = [];
  const seen = new Set<VisitValidationField>();
  for (const issue of issues) {
    if (seen.has(issue.field)) {
      continue;
    }
    seen.add(issue.field);
    switch (issue.field) {
      case "farmer":
        lines.push("Farmer name and mobile required");
        break;
      case "crop":
        lines.push("Crop is required");
        break;
      case "gps":
        lines.push("GPS location is required");
        break;
      case "observation":
        lines.push("Observation / field notes or action details are required");
        break;
      default:
        lines.push(issue.message);
    }
  }
  return lines;
}

export function validateVisitSubmitValues(values: VisitFormValues): string | null {
  const issues = getSubmitIssues(values);
  if (issues.length === 0) {
    return null;
  }
  return getSubmitSummaryLines(issues).join(" ");
}
