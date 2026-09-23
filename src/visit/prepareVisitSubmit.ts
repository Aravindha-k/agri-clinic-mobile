import type { Farmer } from "../api/farmers";
import { coerceFarmerRecord, createFarmer, findFarmerByPhoneOrName, getFarmer } from "../api/farmers";
import type { VisitFormValues } from "../api/visits";
import { extractMasterPk, farmerVillagePkToString, masterPkToString } from "../utils/masterId";
import { hasCompleteNewFarmerDetails } from "./farmerDetails";
import { resolveFarmerPk } from "./resolveFarmerPk";
import { coerceStr, normalizeVisitGpsFields } from "./visitValidation";

function isNumericId(value: unknown) {
  return /^\d+$/.test(coerceStr(value));
}

function draftVillagePk(villageRaw: unknown): string {
  const villagePk = extractMasterPk(villageRaw);
  return villagePk != null ? String(villagePk) : "";
}

function resolvedFarmer(raw: unknown): Farmer | null {
  return coerceFarmerRecord(raw);
}

async function villageFromResolvedFarmer(farmer: Farmer): Promise<string> {
  const direct = farmerVillagePkToString(farmer);
  if (direct) return direct;
  if (farmer.id == null) return "";
  try {
    const full = resolvedFarmer(await getFarmer(farmer.id));
    return full ? farmerVillagePkToString(full) : "";
  } catch {
    return "";
  }
}

function applyResolvedFarmer(
  next: VisitFormValues,
  farmer: Farmer,
  village: string
): VisitFormValues {
  return {
    ...next,
    farmer_id: farmer.id != null ? String(farmer.id) : next.farmer_id,
    farmer_name: coerceStr(farmer.name) || next.farmer_name,
    farmer_phone: coerceStr(farmer.phone) || next.farmer_phone,
    village
  };
}

async function bindResolvedFarmer(
  next: VisitFormValues,
  raw: unknown,
  fallbackVillage = ""
): Promise<VisitFormValues | null> {
  const farmer = resolvedFarmer(raw);
  if (!farmer?.id) return null;
  const village = (await villageFromResolvedFarmer(farmer)) || fallbackVillage;
  return applyResolvedFarmer(next, farmer, village);
}

/** Trim strings, normalize GPS, and ensure farmer_id links to directory farmer. */
export async function prepareVisitForSubmit(
  values: VisitFormValues,
  options?: { pendingFarmerPhoto?: import("../utils/profileImagePick").PickedProfileImage | null }
): Promise<VisitFormValues> {
  const linkedFarmerId = resolveFarmerPk(values as Record<string, unknown>);
  const selectedVillage = draftVillagePk(values.village);

  let next: VisitFormValues = normalizeVisitGpsFields({
    ...values,
    farmer_id: linkedFarmerId != null ? String(linkedFarmerId) : coerceStr(values.farmer_id),
    farmer_name: coerceStr(values.farmer_name),
    farmer_phone: coerceStr(values.farmer_phone),
    crop: coerceStr(values.crop),
    village: selectedVillage,
    land_name: coerceStr(values.land_name),
    crop_health: coerceStr(values.crop_health),
    weed_condition: coerceStr(values.weed_condition),
    general_advice: coerceStr(values.general_advice),
    notes: coerceStr(values.notes),
    observation: coerceStr(values.observation),
    field_notes: coerceStr(values.field_notes),
    problem_seen: coerceStr(values.problem_seen),
    problem_description: coerceStr(values.problem_description),
    problem_category_id: masterPkToString(values.problem_category_id) || undefined,
    problem_master_id: masterPkToString(values.problem_master_id) || undefined,
    problem_item_ids: Array.isArray(values.problem_item_ids)
      ? values.problem_item_ids.map(Number).filter((id) => Number.isFinite(id))
      : values.problem_item_ids,
    action_taken: coerceStr(values.action_taken),
    follow_up_date: coerceStr(values.follow_up_date),
    fertilizer_advice: coerceStr(values.fertilizer_advice),
    pesticide_advice: coerceStr(values.pesticide_advice),
    irrigation_advice: coerceStr(values.irrigation_advice)
  });

  if (isNumericId(next.farmer_id)) {
    try {
      const full = await getFarmer(Number(next.farmer_id));
      const bound = await bindResolvedFarmer(next, full);
      if (bound && extractMasterPk(bound.village) != null) {
        return bound;
      }
    } catch {
      // keep selected village only when the linked farmer profile cannot be loaded
    }
    return next;
  }

  const phone = coerceStr(next.farmer_phone);
  const name = coerceStr(next.farmer_name);
  if (!phone && !name) {
    return next;
  }

  try {
    const match = await findFarmerByPhoneOrName(phone, name);
    if (match?.id != null) {
      const bound = await bindResolvedFarmer(next, match);
      if (bound) return bound;
    }
  } catch {
    // directory lookup failed — try create below
  }

  if (!hasCompleteNewFarmerDetails(next)) {
    return next;
  }

  const villagePk = extractMasterPk(next.village);
  if (villagePk == null) {
    return next;
  }
  const farmerName = coerceStr(next.farmer_name);
  const farmerPhone = coerceStr(next.farmer_phone);

  try {
    const created = await createFarmer({
      name: farmerName,
      phone: farmerPhone,
      village: villagePk
    });
    if (created?.id != null) {
      const farmerId = String(created.id);
      if (options?.pendingFarmerPhoto) {
        const { uploadPendingFarmerPhotoIfNeeded } = await import("./uploadPendingFarmerPhoto");
        await uploadPendingFarmerPhotoIfNeeded(farmerId, options.pendingFarmerPhoto, {
          enqueueOnFailure: true
        });
      }
      const bound = await bindResolvedFarmer(next, created, String(villagePk));
      if (bound) return bound;
    }
  } catch (err) {
    try {
      const existing = await findFarmerByPhoneOrName(farmerPhone, farmerName);
      if (existing?.id != null) {
        const farmerId = String(existing.id);
        if (options?.pendingFarmerPhoto) {
          const { uploadPendingFarmerPhotoIfNeeded } = await import("./uploadPendingFarmerPhoto");
          await uploadPendingFarmerPhotoIfNeeded(farmerId, options.pendingFarmerPhoto, {
            enqueueOnFailure: true
          });
        }
        const bound = await bindResolvedFarmer(next, existing);
        if (bound) return bound;
      }
    } catch {
      // fall through
    }
    const message = err instanceof Error ? err.message : "Could not register farmer";
    throw new Error(message);
  }

  return next;
}
