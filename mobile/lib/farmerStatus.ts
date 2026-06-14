import type { MobileFarmer } from "./farmersApi";

export type FarmerListFilter = "all" | "not_visited" | "recently_visited";

export type LastVisitChip = {
  variant: "green" | "amber" | "red" | "gray";
  label: string;
};

function startOfLocalDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDate(iso: string): Date | null {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(iso: string, ref = new Date()): number {
  const then = parseDate(iso);
  if (!then) return 0;
  const ms = startOfLocalDay(ref).getTime() - startOfLocalDay(then).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function followUpOverdueDays(farmer: MobileFarmer, ref = new Date()): number {
  const raw = followUpDate(farmer);
  if (!raw) return 1;
  const due = parseDate(raw);
  if (!due) return 1;
  const ms = startOfLocalDay(ref).getTime() - startOfLocalDay(due).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000));
}

export function farmerVisitCount(farmer: MobileFarmer) {
  return farmer.total_visits ?? farmer.visit_count ?? farmer.visits ?? 0;
}

function followUpDate(farmer: MobileFarmer): string | null {
  return farmer.follow_up_date ?? farmer.next_follow_up_date ?? null;
}

export function isFollowUpDueToday(farmer: MobileFarmer, ref = new Date()): boolean {
  const raw = followUpDate(farmer);
  if (!raw) return false;
  const due = parseDate(raw);
  if (!due) return false;
  return startOfLocalDay(due).getTime() === startOfLocalDay(ref).getTime();
}

export function isFollowUpOverdue(farmer: MobileFarmer, ref = new Date()): boolean {
  const raw = followUpDate(farmer);
  if (!raw) return Boolean(farmer.follow_up_due);
  const due = parseDate(raw);
  if (!due) return Boolean(farmer.follow_up_due);
  return startOfLocalDay(due).getTime() < startOfLocalDay(ref).getTime();
}

export function isFollowUpDue(farmer: MobileFarmer, ref = new Date()): boolean {
  return isFollowUpDueToday(farmer, ref) || isFollowUpOverdue(farmer, ref) || Boolean(farmer.follow_up_due);
}

export function getLastVisitChip(farmer: MobileFarmer, ref = new Date()): LastVisitChip {
  const visits = farmerVisitCount(farmer);
  if (visits === 0) {
    return { variant: "gray", label: "Never" };
  }

  const last = farmerLastVisitDate(farmer);
  if (!last) {
    return { variant: "gray", label: "Never" };
  }
  const ago = daysSince(last, ref);
  if (ago === 0) return { variant: "green", label: "Today" };
  if (ago === 1) return { variant: "green", label: "1d ago" };
  return { variant: "green", label: `${ago}d ago` };
}

/** Last visit field from mobile directory / MMKV cache. */
export function farmerLastVisitDate(farmer: MobileFarmer): string | null | undefined {
  return farmer.last_visit_date ?? farmer.latest_visit_date;
}

/** MMKV cache filter: never visited (no last visit date). */
export function isNotVisitedFromCache(farmer: MobileFarmer): boolean {
  const last = farmerLastVisitDate(farmer);
  return last === null || last === undefined || last === "";
}

/** MMKV cache filter: visited within the last N days. */
export function isRecentlyVisitedFromCache(farmer: MobileFarmer, ref = new Date(), withinDays = 14): boolean {
  const last = farmerLastVisitDate(farmer);
  if (!last || farmerVisitCount(farmer) === 0) return false;
  return daysSince(last, ref) <= withinDays;
}

export function matchesFarmerFilter(farmer: MobileFarmer, filter: FarmerListFilter, ref = new Date()): boolean {
  if (filter === "not_visited") {
    return isNotVisitedFromCache(farmer);
  }
  if (filter === "recently_visited") {
    return isRecentlyVisitedFromCache(farmer, ref);
  }
  return true;
}

export function filterCachedFarmers(
  rows: MobileFarmer[],
  filter: FarmerListFilter,
  options: {
    villageId?: string;
    villageName?: string;
    searchQuery?: string;
    matchesVillage?: (farmer: MobileFarmer, villageId: string, villageName: string) => boolean;
  } = {}
): MobileFarmer[] {
  const villageId = options.villageId ?? "";
  const villageName = options.villageName ?? "";
  const searchQuery = options.searchQuery ?? "";
  const villageMatch =
    options.matchesVillage ??
    ((farmer: MobileFarmer, id: string, name: string) => {
      if (!id && !name) return true;
      if (id && String(farmer.village) === id) return true;
      const v = (farmer.village_name || "").trim().toLowerCase();
      return name ? v === name.trim().toLowerCase() : false;
    });

  return rows.filter((farmer) => {
    if (!matchesFarmerFilter(farmer, filter)) return false;
    if (!villageMatch(farmer, villageId, villageName)) return false;
    if (!offlineFarmerMatchesSearch(farmer, searchQuery)) return false;
    return true;
  });
}

export function offlineFarmerMatchesSearch(farmer: MobileFarmer, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = [farmer.name, farmer.phone, farmer.village_name, farmer.village]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}
