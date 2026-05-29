import { Visit } from "../api/visits";

export function formatVisitPlaceLine(
  visit: Pick<Visit, "village_name" | "village" | "district_name" | "district">,
  emptyLabel = "Not provided"
) {
  const v =
    visit.village_name ||
    (visit.village != null && !String(visit.village).match(/^\d+$/) ? String(visit.village) : null);
  const d =
    visit.district_name ||
    (visit.district != null && !String(visit.district).match(/^\d+$/) ? String(visit.district) : null);
  return [v, d].filter(Boolean).join(", ") || emptyLabel;
}

export function formatVisitCropLine(visit: Pick<Visit, "crop_info" | "crop">, emptyLabel: string) {
  const name = visit.crop_info?.name;
  if (name) return name;
  const c = visit.crop;
  if (c != null && c !== "") {
    if (typeof c === "number" || (typeof c === "string" && /^\d+$/.test(String(c)))) {
      return "Crop on file";
    }
    return String(c);
  }
  return emptyLabel;
}
