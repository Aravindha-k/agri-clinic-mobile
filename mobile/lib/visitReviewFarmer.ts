import type { Farmer } from "../../src/api/farmers";
import type { MasterOption } from "../../src/api/masters";

export type VisitReviewFarmer = {
  name: string;
  phone: string;
  village: string;
};

function masterLabel(options: MasterOption[], id: string): string {
  const match = options.find((row) => String(row.id) === id);
  return match?.name || match?.name_en || "";
}

/** Review card labels — village is the sole operational place. */
export function resolveVisitReviewFarmer(
  farmer: Farmer | null,
  draft: { name?: string; phone?: string; village_id?: string } | null,
  villages: MasterOption[],
  fallback = "—"
): VisitReviewFarmer {
  return {
    name: farmer?.name?.trim() || draft?.name?.trim() || fallback,
    phone: farmer?.phone?.trim() || draft?.phone?.trim() || fallback,
    village:
      farmer?.village_name?.trim() ||
      (draft?.village_id ? masterLabel(villages, draft.village_id) : "") ||
      fallback
  };
}
