import type { Visit } from "../api/visits";
import { anyFieldStartsWithSearch } from "./prefixSearch";

export function visitMatchesSearch(visit: Visit, query: string): boolean {
  return anyFieldStartsWithSearch(
    query,
    visit.farmer_name,
    visit.farmer_phone,
    visit.village_name,
    visit.crop_name,
    visit.problem_seen,
    visit.field_visit?.problem_category?.code,
    visit.field_visit?.problem_category?.name
  );
}

export type PendingVisitSearchValues = {
  farmer_name?: string | null;
  farmer_phone?: string | null;
  crop_name?: string | null;
  problem_seen?: string | null;
  village?: string | null;
};

export function pendingVisitValuesMatchSearch(values: PendingVisitSearchValues, query: string): boolean {
  return anyFieldStartsWithSearch(
    query,
    values.farmer_name,
    values.farmer_phone,
    values.crop_name,
    values.problem_seen,
    values.village
  );
}
