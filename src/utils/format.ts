import { extractMasterPk } from "./masterId";
import { resolveFarmerPk } from "../visit/resolveFarmerPk";
import { parsePaginatedList } from "./apiUnwrap";
import { applyObservationPayload } from "./visitFieldNotes";

export function normalizeNullable(value: unknown) {
  if (value === "") {
    return null;
  }
  return value;
}

function normalizeId(value: unknown) {
  const pk = extractMasterPk(value);
  if (pk != null) {
    return pk;
  }
  if (value === "") {
    return null;
  }
  return value;
}

function applyFkIds(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (!(key in payload)) {
      continue;
    }
    const pk = extractMasterPk(payload[key]);
    if (pk != null) {
      payload[key] = pk;
    } else if (payload[key] === "" || payload[key] == null) {
      delete payload[key];
    } else {
      delete payload[key];
    }
  }
}

export function normalizeVisitPayload(values: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    district: normalizeId(values.district),
    village: normalizeId(values.village),
    crop: normalizeId(values.crop),
    land_name: values.land_name,
    land_area: normalizeNullable(values.land_area),
    farmer_name: values.farmer_name,
    farmer_phone: values.farmer_phone
  };

  const farmerId = normalizeId(values.farmer_id);
  if (farmerId !== null && farmerId !== undefined && farmerId !== "") {
    payload.farmer_id = farmerId;
  }

  const latitude = normalizeNullable(values.latitude);
  const longitude = normalizeNullable(values.longitude);
  const nextVisitDate = normalizeNullable(values.next_visit_date);

  if (latitude !== null && latitude !== undefined) {
    payload.latitude = latitude;
  }
  if (longitude !== null && longitude !== undefined) {
    payload.longitude = longitude;
  }
  if (nextVisitDate !== null && nextVisitDate !== undefined) {
    payload.next_visit_date = nextVisitDate;
  }
  if (values.notes !== undefined) {
    payload.notes = values.notes;
  }
  [
    "crop_health",
    "pest_issue",
    "disease_issue",
    "weed_condition",
    "fertilizer_advice",
    "pesticide_advice",
    "irrigation_advice",
    "general_advice",
    "follow_up_required",
    "recommendation"
  ].forEach((field) => {
    if (values[field] !== undefined) {
      payload[field] = values[field];
    }
  });
  delete payload.employee_id;
  delete payload.status;
  delete payload.employee;

  if (!payload.farmer_id) {
    delete payload.farmer_id;
  }

  return payload;
}

/** Payload for POST /api/v1/mobile/visits/ (one-shot submit). */
export function normalizeMobileVisitSubmitPayload(
  values: Record<string, unknown>,
  options?: { localSyncId?: string }
) {
  const payload = normalizeVisitPayload(values);

  const farmerPk = resolveFarmerPk(values);
  if (farmerPk != null) {
    payload.farmer = farmerPk;
    payload.farmer_id = farmerPk;
  } else {
    const farmerId = normalizeId(values.farmer_id);
    if (farmerId !== null && farmerId !== undefined && farmerId !== "") {
      payload.farmer = farmerId;
      payload.farmer_id = farmerId;
    }
  }

  const cropId = normalizeId(values.crop);
  if (cropId !== null && cropId !== undefined && cropId !== "") {
    payload.crop = cropId;
    payload.crop_id = cropId;
  } else if (payload.crop !== null && payload.crop !== undefined && payload.crop !== "") {
    payload.crop = normalizeId(payload.crop);
  }

  if (payload.latitude !== null && payload.latitude !== undefined && payload.latitude !== "") {
    payload.latitude = Number(payload.latitude);
  }
  if (payload.longitude !== null && payload.longitude !== undefined && payload.longitude !== "") {
    payload.longitude = Number(payload.longitude);
  }

  const syncId = (options?.localSyncId || values.local_sync_id || "").toString().trim();
  if (syncId) {
    payload.local_sync_id = syncId;
  }

  const dutySessionId = normalizeId(values.duty_session_id);
  if (dutySessionId != null && dutySessionId !== "") {
    payload.duty_session_id = dutySessionId;
  }
  const workdayId = normalizeId(values.workday_id);
  if (workdayId != null && workdayId !== "") {
    payload.workday_id = workdayId;
  }

  const accuracyRaw = values.accuracy;
  if (accuracyRaw != null && accuracyRaw !== "") {
    const accuracy = Number(accuracyRaw);
    if (Number.isFinite(accuracy)) {
      payload.accuracy = accuracy;
    }
  }

  const capturedAt =
    typeof values.captured_at === "string" && values.captured_at.trim()
      ? values.captured_at.trim()
      : "";
  if (capturedAt) {
    const captured = new Date(capturedAt);
    if (!Number.isNaN(captured.getTime())) {
      payload.captured_at = captured.toISOString();
      payload.visit_date =
        typeof values.visit_date === "string" && values.visit_date.trim()
          ? values.visit_date.trim().slice(0, 10)
          : captured.toISOString().slice(0, 10);
      payload.visit_time =
        typeof values.visit_time === "string" && values.visit_time.trim()
          ? values.visit_time.trim()
          : captured.toISOString().slice(11, 19);
    }
  }

  delete payload.status;
  delete payload.employee_id;
  delete payload.employee;

  applyFkIds(payload, ["district", "village", "crop", "farmer", "farmer_id", "crop_id"]);

  applyObservationPayload(payload, values);

  const problemCategoryId = normalizeId(values.problem_category_id);
  if (problemCategoryId !== null && problemCategoryId !== undefined && problemCategoryId !== "") {
    payload.problem_category_id = problemCategoryId;
  }
  const problemMasterId = normalizeId(values.problem_master_id);
  if (problemMasterId !== null && problemMasterId !== undefined && problemMasterId !== "") {
    payload.problem_master_id = problemMasterId;
  }
  const problemDescription = String(values.problem_description ?? values.problem_seen ?? "").trim();
  if (problemDescription) {
    payload.problem_description = problemDescription;
    payload.problem_seen = problemDescription;
  }

  return payload;
}

export function asArray<T>(value: unknown): T[] {
  return parsePaginatedList<T>(value).results;
}

export type VisitDateFields = {
  visit_date?: string | null;
  visit_time?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** ISO string for display/sorting: visit_date+visit_time → created_at → updated_at. */
export function visitDisplayIso(visit: VisitDateFields): string | null {
  if (visit.visit_date) {
    const datePart = String(visit.visit_date).trim();
    const dateOnly = datePart.includes("T") ? datePart.split("T")[0] : datePart.slice(0, 10);
    if (visit.visit_time) {
      const timeRaw = String(visit.visit_time).trim();
      if (timeRaw.includes("T")) {
        return timeRaw;
      }
      const timePart = timeRaw.length <= 5 ? `${timeRaw}:00` : timeRaw;
      return `${dateOnly}T${timePart}`;
    }
    return datePart.includes("T") ? datePart : `${dateOnly}T12:00:00`;
  }
  return visit.created_at ?? visit.updated_at ?? null;
}

export function getVisitDisplayDateTime(visit: VisitDateFields): string {
  return formatDisplayDateTime(visitDisplayIso(visit));
}

/** @deprecated Use visitDisplayIso */
export function visitRecordDate(visit: VisitDateFields) {
  return visitDisplayIso(visit);
}

export function formatVisitWhen(visit: VisitDateFields) {
  return getVisitDisplayDateTime(visit);
}

export function isSameVisitLocalDay(visit: VisitDateFields, ref: Date) {
  return isSameLocalDay(visitDisplayIso(visit), ref);
}

export function formatDisplayDateTime(iso?: string | null) {
  if (!iso) {
    return "Not recorded";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Compact timestamp for dense rows (e.g. tracking). */
export function formatShortDateTime(iso?: string | null) {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function isSameLocalDay(iso: string | undefined | null, ref: Date) {
  if (!iso) {
    return false;
  }
  const date = new Date(iso);
  if (!Number.isNaN(date.getTime())) {
    return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth() && date.getDate() === ref.getDate();
  }
  const dayPart = iso.slice(0, 10);
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, "0");
  const d = String(ref.getDate()).padStart(2, "0");
  return dayPart === `${y}-${m}-${d}`;
}

/** Visits in the last `withinDays` calendar days, excluding today (for "Recent" filter). */
export function isRecentVisitNotToday(iso: string | undefined | null, ref: Date, withinDays: number) {
  if (!iso) {
    return false;
  }
  if (isSameLocalDay(iso, ref)) {
    return false;
  }
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    return false;
  }
  const diff = ref.getTime() - t;
  return diff > 0 && diff <= withinDays * 24 * 60 * 60 * 1000;
}

export function isRecentVisitNotTodayEntry(visit: VisitDateFields, ref: Date, withinDays: number) {
  return isRecentVisitNotToday(visitDisplayIso(visit), ref, withinDays);
}
