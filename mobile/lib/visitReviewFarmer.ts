import type { Farmer } from "../../src/api/farmers";
import type { MasterOption } from "../../src/api/masters";
import { getOptionLabel } from "../../src/api/masters";
import type { NewFarmerDraft } from "../store/visitFormStore";

export type VisitReviewFarmer = {
  name: string;
  phone: string;
  village: string;
  district: string;
};

function masterLabel(items: MasterOption[], id: string): string {
  const match = items.find((item) => String(item.id) === id);
  return match ? getOptionLabel(match) : "";
}

export function resolveVisitReviewFarmer(
  farmer: Farmer | null,
  draft: NewFarmerDraft | null,
  districts: MasterOption[],
  villages: MasterOption[],
  fallback: string
): VisitReviewFarmer {
  return {
    name: farmer?.name?.trim() || draft?.name?.trim() || fallback,
    phone: farmer?.phone?.trim() || draft?.phone?.trim() || fallback,
    village:
      farmer?.village_name?.trim() ||
      (draft?.village_id ? masterLabel(villages, draft.village_id) : "") ||
      fallback,
    district:
      farmer?.district_name?.trim() ||
      (draft?.district_id ? masterLabel(districts, draft.district_id) : "") ||
      fallback
  };
}
