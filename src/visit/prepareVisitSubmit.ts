import type { VisitFormValues } from "../api/visits";
import { createFarmer, findFarmerByPhoneOrName } from "../api/farmers";
import { getOptionLabel, getVillages } from "../api/masters";
import { extractMasterPk, masterPkToString } from "../utils/masterId";
import { hasCompleteNewFarmerDetails } from "./farmerDetails";
import { resolveFarmerPk } from "./resolveFarmerPk";
import { coerceStr, normalizeVisitGpsFields } from "./visitValidation";

function isNumericId(value: unknown) {
  return /^\d+$/.test(coerceStr(value));
}

async function resolveVillagePk(districtRaw: unknown, villageRaw: unknown): Promise<string> {
  const villagePk = extractMasterPk(villageRaw);
  if (villagePk != null) {
    return String(villagePk);
  }
  const label = coerceStr(villageRaw);
  if (!label || /^\d+$/.test(label)) {
    return "";
  }
  const districtPk = extractMasterPk(districtRaw);
  try {
    const villages = await getVillages();
    const match = villages.find((v) => {
      if (districtPk != null && v.district != null && Number(v.district) !== districtPk) {
        return false;
      }
      const name = getOptionLabel(v).toLowerCase();
      return name === label.toLowerCase() || coerceStr(v.name).toLowerCase() === label.toLowerCase();
    });
    return match?.id != null ? String(match.id) : "";
  } catch {
    return "";
  }
}

/** Trim strings, normalize GPS, and ensure farmer_id links to directory farmer. */
export async function prepareVisitForSubmit(values: VisitFormValues): Promise<VisitFormValues> {
  const linkedFarmerId = resolveFarmerPk(values as Record<string, unknown>);
  const resolvedVillage = await resolveVillagePk(values.district, values.village);

  let next: VisitFormValues = normalizeVisitGpsFields({
    ...values,
    farmer_id: linkedFarmerId != null ? String(linkedFarmerId) : coerceStr(values.farmer_id),
    farmer_name: coerceStr(values.farmer_name),
    farmer_phone: coerceStr(values.farmer_phone),
    crop: coerceStr(values.crop),
    district: masterPkToString(values.district),
    village: resolvedVillage || masterPkToString(values.village),
    land_name: coerceStr(values.land_name),
    crop_health: coerceStr(values.crop_health),
    weed_condition: coerceStr(values.weed_condition),
    general_advice: coerceStr(values.general_advice),
    notes: coerceStr(values.notes),
    observation: coerceStr(values.observation),
    field_notes: coerceStr(values.field_notes),
    problem_seen: coerceStr(values.problem_seen),
    problem_description: coerceStr(values.problem_description),
    problem_category_id: coerceStr(values.problem_category_id),
    problem_master_id: coerceStr(values.problem_master_id),
    action_taken: coerceStr(values.action_taken),
    follow_up_date: coerceStr(values.follow_up_date),
    fertilizer_advice: coerceStr(values.fertilizer_advice),
    pesticide_advice: coerceStr(values.pesticide_advice),
    irrigation_advice: coerceStr(values.irrigation_advice)
  });

  if (isNumericId(next.farmer_id)) {
    return next;
  }

  const phone = coerceStr(next.farmer_phone);
  const name = coerceStr(next.farmer_name).toLowerCase();
  if (!phone && !name) {
    return next;
  }

  try {
    const match = await findFarmerByPhoneOrName(phone, name);
    if (match?.id != null) {
      next = {
        ...next,
        farmer_id: String(match.id),
        farmer_name: coerceStr(match.name) || next.farmer_name,
        farmer_phone: coerceStr(match.phone) || next.farmer_phone,
        district: masterPkToString(match.district) || next.district,
        village: masterPkToString(match.village) || next.village
      };
      return next;
    }
  } catch {
    // directory lookup failed — try create below
  }

  if (!hasCompleteNewFarmerDetails(next)) {
    return next;
  }

  const districtPk = extractMasterPk(next.district);
  const villagePk = extractMasterPk(next.village);
  if (districtPk == null || villagePk == null) {
    return next;
  }
  const farmerName = coerceStr(next.farmer_name);
  const farmerPhone = coerceStr(next.farmer_phone);

  try {
    const created = await createFarmer({
      name: farmerName,
      phone: farmerPhone,
      district: districtPk,
      village: villagePk
    });
    if (created.id != null) {
      return {
        ...next,
        farmer_id: String(created.id),
        farmer_name: coerceStr(created.name) || farmerName,
        farmer_phone: coerceStr(created.phone) || farmerPhone,
        district: masterPkToString(created.district) || next.district,
        village: masterPkToString(created.village) || next.village
      };
    }
  } catch (err) {
    try {
      const existing = await findFarmerByPhoneOrName(farmerPhone, farmerName);
      if (existing?.id != null) {
        return {
          ...next,
          farmer_id: String(existing.id),
          farmer_name: coerceStr(existing.name) || farmerName,
          farmer_phone: coerceStr(existing.phone) || farmerPhone
        };
      }
    } catch {
      // fall through
    }
    const message = err instanceof Error ? err.message : "Could not register farmer";
    throw new Error(message);
  }

  return next;
}
