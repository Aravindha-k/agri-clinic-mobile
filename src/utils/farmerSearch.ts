import { Farmer } from "../api/farmers";

/** Searchable text for name, mobile, village, district, and crop. */
export function farmerSearchText(farmer: Farmer): string {
  return [
    farmer.name,
    farmer.phone,
    farmer.village_name,
    farmer.village,
    farmer.district_name,
    farmer.district,
    farmer.crop_name,
    farmer.list_crop_name
  ]
    .filter((part) => part != null && String(part).trim() !== "")
    .join(" ")
    .toLowerCase();
}

export function farmerMatchesSearch(farmer: Farmer, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return farmerSearchText(farmer).includes(needle);
}
