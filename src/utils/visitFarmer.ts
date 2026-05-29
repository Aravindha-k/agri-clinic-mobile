import type { Visit } from "../api/visits";

export type ResolvedFarmer = {
  name: string;
  phone: string;
  village: string;
  district: string;
  cropName: string;
};

export function resolveVisitFarmer(visit: Partial<Visit> | null | undefined): ResolvedFarmer {
  if (!visit || typeof visit !== "object") {
    return { name: "—", phone: "—", village: "—", district: "—", cropName: "—" };
  }
  const f = visit.farmer as
    | {
        name?: string;
        phone?: string;
        mobile?: string;
        village?: string;
        crop_name?: string;
      }
    | undefined;

  const crop = visit.crop_info ?? visit.crop;
  const cropName =
    f?.crop_name ??
    visit.crop_name ??
    (typeof crop === "object" && crop !== null
      ? (crop as { name_en?: string; name?: string }).name_en ??
        (crop as { name?: string }).name
      : null) ??
    "—";

  return {
    name: f?.name ?? visit.farmer_name ?? "—",
    phone: f?.mobile ?? visit.farmer_mobile ?? f?.phone ?? visit.farmer_phone ?? "—",
    village: f?.village ?? visit.farmer_village ?? visit.village_name ?? "—",
    district: visit.district_name ?? "—",
    cropName: cropName || "—"
  };
}

export function normalizeVisitFromApi(visit: Visit): Visit {
  const farmer = resolveVisitFarmer(visit);
  const nestedFarmer = visit.farmer
    ? {
        ...visit.farmer,
        name: visit.farmer.name ?? (farmer.name !== "—" ? farmer.name : ""),
        mobile:
          visit.farmer.mobile ??
          (farmer.phone !== "—" ? farmer.phone : undefined),
        phone: visit.farmer.phone ?? visit.farmer.mobile ?? farmer.phone,
        village: visit.farmer.village ?? (farmer.village !== "—" ? farmer.village : undefined),
        crop_name: visit.farmer.crop_name ?? (farmer.cropName !== "—" ? farmer.cropName : undefined)
      }
    : undefined;

  return {
    ...visit,
    farmer: nestedFarmer,
    farmer_name: visit.farmer_name || (farmer.name !== "—" ? farmer.name : ""),
    farmer_phone: visit.farmer_phone || (farmer.phone !== "—" ? farmer.phone : ""),
    farmer_mobile: visit.farmer_mobile ?? (farmer.phone !== "—" ? farmer.phone : undefined),
    village_name: visit.village_name || (farmer.village !== "—" ? farmer.village : undefined),
    crop_name: visit.crop_name ?? (farmer.cropName !== "—" ? farmer.cropName : undefined)
  };
}

export function logVisitFarmerBlock(visit: Partial<Visit> | null | undefined, label: string) {
  if (!visit) return;
  const block =
    visit.farmer ??
    ({
      farmer_name: visit.farmer_name,
      farmer_mobile: visit.farmer_mobile,
      farmer_village: visit.farmer_village,
      crop_name: visit.crop_name
    } as const);
  console.log(label, block);
}
