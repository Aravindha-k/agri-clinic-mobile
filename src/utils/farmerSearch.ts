import { Farmer } from "../api/farmers";
import { anyFieldStartsWithSearch } from "./prefixSearch";

/** Prefix-match each farmer field independently — never a concatenated haystack. */
export function farmerMatchesSearch(farmer: Farmer, query: string): boolean {
  return anyFieldStartsWithSearch(
    query,
    farmer.name,
    farmer.phone,
    farmer.village_name,
    farmer.village,
    farmer.district_name,
    farmer.district,
    farmer.taluk_name,
    farmer.taluk,
    farmer.crop_name,
    farmer.list_crop_name
  );
}

/** @deprecated Use farmerMatchesSearch — kept for callers that built display haystacks. */
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
