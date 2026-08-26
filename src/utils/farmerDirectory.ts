import { Farmer } from "../api/farmers";
import { formatIndiaDate } from "./indiaDateTime";

export type FarmerQuickFilter = "all" | "recent" | "not_visited";

export function farmerVisitCount(farmer: Farmer) {
  return farmer.total_visits ?? farmer.visit_count ?? farmer.visits ?? 0;
}

export function formatFarmerLastVisit(farmer: Farmer): string {
  const raw = farmer.latest_visit_date;
  if (!raw) return "—";
  return formatIndiaDate(raw);
}

export function matchesFarmerQuickFilter(farmer: Farmer, filter: FarmerQuickFilter, withinDays = 90) {
  const visits = farmerVisitCount(farmer);
  if (filter === "not_visited") {
    return visits === 0;
  }
  if (filter === "recent") {
    if (visits === 0 || !farmer.latest_visit_date) return false;
    const iso = farmer.latest_visit_date.includes("T")
      ? farmer.latest_visit_date
      : `${farmer.latest_visit_date}T12:00:00`;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    const diff = Date.now() - t;
    return diff >= 0 && diff <= withinDays * 24 * 60 * 60 * 1000;
  }
  return true;
}
