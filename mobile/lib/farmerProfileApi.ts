import { apiClient } from "../../src/api/client";
import {
  Farmer,
  getFarmer,
  getFarmerFields,
  getFarmerVisits
} from "../../src/api/farmers";
import type { Visit } from "../../src/api/visits";
import { asArray, getVisitDisplayDateTime } from "../../src/utils/format";
import { cropLabelFromVisit } from "../../src/utils/farmerPrefill";
import { countOpenIssues } from "../../src/utils/farmerTimeline";

export type FieldCrop = {
  crop_name: string;
  field_name?: string;
  stage?: string;
};

export type FarmerField = {
  id: string;
  land_name: string;
  land_size?: string;
  soil_type?: string;
  irrigation_type?: string;
  crops: FieldCrop[];
};

export type CurrentCropCard = {
  id: string;
  crop_name: string;
  field_name?: string;
  stage?: string;
  tone: "blue" | "green" | "amber";
};

export type MobileFarmerProfile = {
  farmer: Farmer;
  farmer_code?: string;
  land_area?: string;
  irrigation_type?: string;
  soil_type?: string;
  current_crops: CurrentCropCard[];
  fields: FarmerField[];
  visits: Visit[];
  total_visits: number;
  open_issues: number;
  last_visit_label: string;
};

const CROP_TONES: CurrentCropCard["tone"][] = ["blue", "green", "amber"];

function str(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function parseFieldCrops(raw: unknown): FieldCrop[] {
  if (!Array.isArray(raw)) return [];
  const crops: FieldCrop[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const crop_name = str(row.crop_name || row.crop || row.name);
    if (!crop_name) continue;
    crops.push({
      crop_name,
      field_name: str(row.field_name || row.land_name || row.plot_name),
      stage: str(row.stage || row.growth_stage || row.crop_stage)
    });
  }
  return crops;
}

function parseField(raw: unknown, index: number): FarmerField | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const land_name = str(row.land_name || row.field_name || row.plot_name || row.name) || `Field ${index + 1}`;
  return {
    id: str(row.id) || `field-${index}`,
    land_name,
    land_size: str(row.land_size || row.land_area || row.area || row.acreage),
    soil_type: str(row.soil_type || row.soil),
    irrigation_type: str(row.irrigation_type || row.irrigation),
    crops: parseFieldCrops(row.crops || row.field_crops || row.current_crops)
  };
}

function buildCurrentCrops(fields: FarmerField[], farmer: Farmer): CurrentCropCard[] {
  const cards: CurrentCropCard[] = [];
  for (const field of fields) {
    for (const crop of field.crops) {
      cards.push({
        id: `${field.id}-${crop.crop_name}-${cards.length}`,
        crop_name: crop.crop_name,
        field_name: crop.field_name || field.land_name,
        stage: crop.stage,
        tone: CROP_TONES[cards.length % CROP_TONES.length]
      });
    }
  }
  if (cards.length === 0) {
    const fallback = farmer.crop_name || farmer.list_crop_name;
    if (fallback) {
      cards.push({
        id: "farmer-crop",
        crop_name: fallback,
        field_name: farmer.village_name || undefined,
        tone: "green"
      });
    }
  }
  return cards;
}

function visitTimestamp(visit: Visit) {
  const raw = visit.visit_date || visit.created_at || visit.updated_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function buildFromParts(farmer: Farmer, fieldsRaw: unknown[], visits: Visit[]): MobileFarmerProfile {
  const fields = fieldsRaw
    .map((row, index) => parseField(row, index))
    .filter((row): row is FarmerField => row != null);
  const sortedVisits = [...visits].sort((a, b) => visitTimestamp(b) - visitTimestamp(a));
  const latest = sortedVisits[0];

  const firstField = fields[0];
  return {
    farmer,
    farmer_code: str((farmer as Record<string, unknown>).farmer_code) || `F-${farmer.id}`,
    land_area:
      str((farmer as Record<string, unknown>).land_area) ||
      str(farmer.total_land_area) ||
      str(farmer.land_area) ||
      firstField?.land_size,
    irrigation_type: str((farmer as Record<string, unknown>).irrigation_type) || firstField?.irrigation_type,
    soil_type: str((farmer as Record<string, unknown>).soil_type) || firstField?.soil_type,
    current_crops: buildCurrentCrops(fields, farmer),
    fields,
    visits: sortedVisits,
    total_visits: sortedVisits.length,
    open_issues: countOpenIssues(sortedVisits),
    last_visit_label: latest ? getVisitDisplayDateTime(latest) || "—" : "—"
  };
}

function normalizeMobileProfile(data: unknown, pk: number): MobileFarmerProfile | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const farmerRaw =
    row.farmer && typeof row.farmer === "object"
      ? (row.farmer as Farmer)
      : ({ ...row, id: typeof row.id === "number" ? row.id : pk } as Farmer);

  const fieldsRaw = row.fields ?? row.land_parcels ?? row.farmer_fields ?? [];
  const visitsRaw = row.visits ?? row.visit_history ?? row.recent_visits ?? [];

  const fields = asArray(fieldsRaw)
    .map((item, index) => parseField(item, index))
    .filter((item): item is FarmerField => item != null);

  const visits = asArray<Visit>(visitsRaw);
  const base = buildFromParts(farmerRaw, fields, visits);

  return {
    ...base,
    farmer_code: str(row.farmer_code) || base.farmer_code,
    land_area: str(row.land_area) || str(row.total_land_area) || base.land_area,
    irrigation_type: str(row.irrigation_type) || base.irrigation_type,
    soil_type: str(row.soil_type) || base.soil_type,
    total_visits: Number(row.total_visits ?? row.visit_count ?? base.total_visits) || base.total_visits,
    open_issues: Number(row.open_issues ?? base.open_issues) || base.open_issues,
    last_visit_label: str(row.last_visit_date) || base.last_visit_label,
    current_crops:
      Array.isArray(row.current_crops) && row.current_crops.length
        ? asArray(row.current_crops).map((item, index) => {
            const crop = item as Record<string, unknown>;
            return {
              id: str(crop.id) || `crop-${index}`,
              crop_name: str(crop.crop_name || crop.name) || "Crop",
              field_name: str(crop.field_name || crop.land_name),
              stage: str(crop.stage || crop.growth_stage),
              tone: CROP_TONES[index % CROP_TONES.length]
            };
          })
        : base.current_crops
  };
}

export async function fetchMobileFarmerProfile(pk: number): Promise<MobileFarmerProfile> {
  try {
    const data = await apiClient<unknown>(`mobile/farmers/${pk}/`, { source: "FarmerProfile" });
    const normalized = normalizeMobileProfile(data, pk);
    if (normalized) return normalized;
  } catch {
    // fallback below
  }

  const [farmer, fieldsRaw, visits] = await Promise.all([
    getFarmer(pk),
    getFarmerFields(pk).catch(() => []),
    getFarmerVisits(pk).catch(() => [])
  ]);

  return buildFromParts(farmer, asArray(fieldsRaw), visits);
}

export function problemCategoryFromVisit(visit: Visit | null | undefined): string {
  if (!visit) return "General";
  const cat = visit.field_visit?.problem_category?.name;
  if (cat?.trim()) return cat.trim();
  if (visit.problem_seen?.trim()) return visit.problem_seen.trim();
  if (visit.pest_issue) return "Pest";
  if (visit.disease_issue) return "Disease";
  return "General";
}

export function severityFromVisit(visit: Visit): { label: string; variant: "green" | "amber" | "red" } {
  if (visit.disease_issue) return { label: "High", variant: "red" };
  if (visit.pest_issue) return { label: "Medium", variant: "amber" };
  return { label: "Low", variant: "green" };
}

export function recommendationFromVisit(visit: Visit): string {
  const parts = [
    visit.recommendation?.trim(),
    visit.action_taken?.trim(),
    visit.general_advice?.trim(),
    visit.fertilizer_advice?.trim(),
    visit.pesticide_advice?.trim(),
    visit.irrigation_advice?.trim()
  ].filter(Boolean);
  return parts[0] ?? "";
}

export function cropFromVisit(visit: Visit): string {
  return cropLabelFromVisit(visit) || "Crop";
}
