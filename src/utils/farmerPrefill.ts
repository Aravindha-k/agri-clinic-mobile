import { Farmer, getFarmer, getFarmerFields, getFarmerVisits } from "../api/farmers";
import { getCrops, getOptionLabel, MasterOption } from "../api/masters";
import { Visit, VisitFormValues } from "../api/visits";
import { asArray } from "./format";
import { extractMasterPk, masterPkToString } from "./masterId";
import { normalizeVisitFromApi } from "./visitFarmer";

export type VisitFormPrefill = Partial<
  Omit<VisitFormValues, "latitude" | "longitude" | "local_sync_id">
> & {
  problem_category_code?: string;
  recommendation?: string;
};

export type VisitDraftMetaFromPrefill = {
  farmerDisplayName?: string;
  cropLabel?: string;
  villageLabel?: string;
  districtLabel?: string;
};

export type RevisitMasters = {
  districts: MasterOption[];
  villages: MasterOption[];
  crops?: MasterOption[];
};

function labelMatches(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function findOptionIdByLabel(options: MasterOption[], label?: string | null): string {
  const name = label?.trim();
  if (!name) return "";
  const match = options.find((o) => labelMatches(getOptionLabel(o), name));
  return match ? String(match.id) : "";
}

export function extractCropIdFromVisit(visit: Visit): string {
  if (visit.crop_info?.id != null) {
    return String(visit.crop_info.id);
  }
  const fromCrop = masterPkToString(visit.crop);
  if (fromCrop) return fromCrop;
  return extractMasterPk(visit.crop) != null ? String(extractMasterPk(visit.crop)) : "";
}

export function cropLabelFromVisit(visit: Visit): string | undefined {
  const info = visit.crop_info;
  if (info && typeof info === "object") {
    return info.name_en || info.name || info.name_ta || undefined;
  }
  if (visit.crop_name?.trim()) {
    return visit.crop_name;
  }
  if (typeof visit.crop === "string" && visit.crop.trim() && !/^\d+$/.test(visit.crop)) {
    return visit.crop;
  }
  return undefined;
}

function visitTimestamp(visit: Visit): number {
  const raw = visit.visit_date || visit.created_at || visit.updated_at;
  return raw ? new Date(raw).getTime() : 0;
}

export function getLatestVisit(visits: Visit[]): Visit | null {
  if (!visits.length) return null;
  return [...visits].sort((a, b) => visitTimestamp(b) - visitTimestamp(a))[0] ?? null;
}

export function prefillFromFarmer(farmer: Farmer): VisitFormPrefill {
  return {
    farmer_id: farmer.id != null ? String(farmer.id) : "",
    farmer_name: farmer.name || "",
    farmer_phone: farmer.phone || "",
    district: masterPkToString(farmer.district),
    village: masterPkToString(farmer.village),
    land_name: "",
    land_area: farmer.land_area?.toString() || farmer.total_land_area?.toString() || ""
  };
}

function problemCategoryIdFromVisit(visit: Visit): string {
  if (visit.problem_category_id != null) return String(visit.problem_category_id);
  const nested = visit.field_visit?.problem_category?.id;
  return nested != null ? String(nested) : "";
}

function problemMasterIdFromVisit(visit: Visit): string {
  if (visit.problem_master_id != null) return String(visit.problem_master_id);
  const nested = visit.field_visit?.problem_master?.id;
  return nested != null ? String(nested) : "";
}

function problemCategoryCodeFromVisit(visit: Visit): string {
  return visit.field_visit?.problem_category?.code?.trim() || "";
}

export function prefillFromVisit(visit: Visit): VisitFormPrefill {
  return {
    district: masterPkToString(visit.district),
    village: masterPkToString(visit.village),
    crop: extractCropIdFromVisit(visit),
    land_name: visit.land_name || "",
    land_area: visit.land_area?.toString() || "",
    notes: visit.notes || "",
    crop_health: visit.crop_health || "",
    pest_issue: Boolean(visit.pest_issue),
    disease_issue: Boolean(visit.disease_issue),
    weed_condition: visit.weed_condition || "",
    fertilizer_advice: visit.fertilizer_advice || "",
    pesticide_advice: visit.pesticide_advice || "",
    irrigation_advice: visit.irrigation_advice || "",
    general_advice: visit.general_advice || "",
    recommendation: visit.recommendation || "",
    follow_up_required: Boolean(visit.follow_up_required),
    next_visit_date: visit.next_visit_date || "",
    observation: visit.observation || visit.field_notes || "",
    field_notes: visit.field_notes || visit.observation || "",
    problem_seen: visit.problem_seen || "",
    action_taken: visit.action_taken || "",
    follow_up_date: visit.follow_up_date || visit.next_visit_date || "",
    crop_name: visit.crop_name || "",
    problem_category_id: problemCategoryIdFromVisit(visit),
    problem_master_id: problemMasterIdFromVisit(visit),
    problem_category_code: problemCategoryCodeFromVisit(visit)
  };
}

function extractLandFromFields(fields: unknown[]): Pick<VisitFormPrefill, "land_name" | "land_area"> {
  const first = fields[0];
  if (!first || typeof first !== "object") {
    return {};
  }
  const row = first as Record<string, unknown>;
  const land_name = String(row.name || row.land_name || row.field_name || "").trim();
  const land_area = row.area?.toString() || row.land_area?.toString() || row.total_area?.toString() || "";
  return {
    land_name: land_name || undefined,
    land_area: land_area || undefined
  };
}

export function resolveDistrictId(farmer: Farmer, visit: Visit | null, districts: MasterOption[]): string {
  const fromFarmer = masterPkToString(farmer.district);
  if (fromFarmer) return fromFarmer;
  const fromVisit = visit ? masterPkToString(visit.district) : "";
  if (fromVisit) return fromVisit;
  return findOptionIdByLabel(districts, farmer.district_name || visit?.district_name);
}

export function resolveVillageId(
  farmer: Farmer,
  visit: Visit | null,
  villages: MasterOption[],
  districtId: string
): string {
  const fromFarmer = masterPkToString(farmer.village);
  if (fromFarmer) return fromFarmer;
  const fromVisit = visit ? masterPkToString(visit.village) : "";
  if (fromVisit) return fromVisit;
  const name = farmer.village_name || visit?.village_name || visit?.farmer_village;
  const scoped = districtId
    ? villages.filter((v) => !v.district || String(v.district) === districtId)
    : villages;
  return findOptionIdByLabel(scoped, name);
}

export function resolveCropId(
  farmer: Farmer,
  visit: Visit | null,
  crops: MasterOption[] | undefined
): string {
  if (visit) {
    const fromVisit = extractCropIdFromVisit(visit);
    if (fromVisit) return fromVisit;
    const visitLabel = cropLabelFromVisit(visit);
    const byVisitName = crops ? findOptionIdByLabel(crops, visitLabel) : "";
    if (byVisitName) return byVisitName;
  }
  const farmerCrop = farmer.crop_name || farmer.list_crop_name;
  return crops ? findOptionIdByLabel(crops, farmerCrop) : "";
}

/** Farmer profile + last visit fields for a revisit. */
export function buildRevisitPrefill(farmer: Farmer, lastVisit?: Visit | null): VisitFormPrefill {
  const fromFarmer = prefillFromFarmer(farmer);
  if (!lastVisit) {
    return fromFarmer;
  }
  const fromVisit = prefillFromVisit(lastVisit);
  return {
    ...fromVisit,
    ...fromFarmer,
    crop: fromVisit.crop || fromFarmer.crop,
    land_name: fromVisit.land_name || fromFarmer.land_name,
    land_area: fromVisit.land_area || fromFarmer.land_area,
    district: fromFarmer.district || fromVisit.district,
    village: fromFarmer.village || fromVisit.village,
    notes: fromVisit.notes,
    crop_health: fromVisit.crop_health,
    pest_issue: fromVisit.pest_issue,
    disease_issue: fromVisit.disease_issue,
    weed_condition: fromVisit.weed_condition,
    fertilizer_advice: fromVisit.fertilizer_advice,
    pesticide_advice: fromVisit.pesticide_advice,
    irrigation_advice: fromVisit.irrigation_advice,
    general_advice: fromVisit.general_advice,
    follow_up_required: fromVisit.follow_up_required,
    observation: fromVisit.observation,
    field_notes: fromVisit.field_notes,
    problem_seen: fromVisit.problem_seen,
    action_taken: fromVisit.action_taken,
    follow_up_date: fromVisit.follow_up_date,
    next_visit_date: fromVisit.next_visit_date
  };
}

export function normalizeRevisitPrefill(
  farmer: Farmer,
  lastVisit: Visit | null,
  masters: RevisitMasters,
  landFromFields?: Pick<VisitFormPrefill, "land_name" | "land_area">
): VisitFormPrefill {
  const base = buildRevisitPrefill(farmer, lastVisit);
  const district = resolveDistrictId(farmer, lastVisit, masters.districts) || base.district || "";
  const village = resolveVillageId(farmer, lastVisit, masters.villages, district) || base.village || "";
  const crop = resolveCropId(farmer, lastVisit, masters.crops) || base.crop || "";

  return {
    ...base,
    district,
    village,
    crop,
    land_name: base.land_name || landFromFields?.land_name || "",
    land_area: base.land_area || landFromFields?.land_area || ""
  };
}

export function metaFromRevisitPrefill(
  farmer: Farmer,
  lastVisit: Visit | null,
  masters: RevisitMasters,
  values: VisitFormPrefill
): VisitDraftMetaFromPrefill {
  const districtLabel =
    farmer.district_name ||
    masters.districts.find((d) => String(d.id) === values.district)?.name ||
    masters.districts.find((d) => String(d.id) === values.district)?.name_en;
  const villageLabel =
    farmer.village_name ||
    masters.villages.find((v) => String(v.id) === values.village)?.name ||
    masters.villages.find((v) => String(v.id) === values.village)?.name_en;
  const cropMatch = masters.crops?.find((c) => String(c.id) === values.crop);
  const cropLabel =
    (lastVisit ? cropLabelFromVisit(lastVisit) : undefined) ||
    farmer.crop_name ||
    farmer.list_crop_name ||
    (cropMatch ? getOptionLabel(cropMatch) : undefined);

  return {
    farmerDisplayName: farmer.name || farmer.phone || "Farmer",
    districtLabel: districtLabel || undefined,
    villageLabel: villageLabel || undefined,
    cropLabel: cropLabel && cropLabel !== "#0" ? cropLabel : undefined
  };
}

export type LoadedRevisitPrefill = {
  values: VisitFormPrefill;
  meta: VisitDraftMetaFromPrefill;
  farmer: Farmer;
  lastVisit: Visit | null;
};

/** Load full farmer profile, last visit, land plots, and resolve master IDs for dropdowns. */
export async function loadRevisitPrefill(
  farmer: Farmer,
  masters: RevisitMasters
): Promise<LoadedRevisitPrefill> {
  let full = farmer;
  let lastVisit: Visit | null = null;
  let landFromFields: Pick<VisitFormPrefill, "land_name" | "land_area"> = {};

  let crops = masters.crops;
  if (!crops?.length) {
    crops = await getCrops().catch(() => []);
  }
  const mastersWithCrops: RevisitMasters = { ...masters, crops };

  if (farmer.id) {
    const [profile, visitsRaw, fieldsRaw] = await Promise.all([
      getFarmer(farmer.id).catch(() => farmer),
      getFarmerVisits(farmer.id).catch(() => []),
      getFarmerFields(farmer.id).catch(() => [])
    ]);
    full = profile;
    const visits = asArray<Visit>(visitsRaw).map(normalizeVisitFromApi);
    lastVisit = getLatestVisit(visits);
    landFromFields = extractLandFromFields(asArray(fieldsRaw));
  }

  const values = normalizeRevisitPrefill(full, lastVisit, mastersWithCrops, landFromFields);
  const meta = metaFromRevisitPrefill(full, lastVisit, mastersWithCrops, values);
  return { values, meta, farmer: full, lastVisit };
}

/** If crop id stored in form does not match options, resolve by display label. */
export function resolveCropValueForOptions(
  cropValue: string,
  cropLabel: string | undefined,
  crops: MasterOption[]
): string {
  if (!cropValue && !cropLabel) return cropValue;
  if (cropValue && crops.some((c) => String(c.id) === cropValue)) {
    return cropValue;
  }
  const byLabel = findOptionIdByLabel(crops, cropLabel);
  if (byLabel) return byLabel;
  if (cropValue && !/^\d+$/.test(cropValue)) {
    return findOptionIdByLabel(crops, cropValue);
  }
  return cropValue;
}
