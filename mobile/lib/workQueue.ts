import type { MobileFarmer } from "./farmersApi";
import { farmerLastVisitDate, farmerVisitCount } from "./farmerStatus";

export type VisitPriorityLabel = "Routine";

export type FarmerWorkflowMeta = {
  lastVisitDateLabel: string | null;
};

export type FarmerPickRow = {
  farmer: MobileFarmer;
  workflow: FarmerWorkflowMeta;
};

export type VillageNameSource = {
  village_name?: string | null;
  village?: string | number | null;
};

export type FarmerWorkSectionId = "never_visited" | "recently_visited" | "all_farmers";

export type FarmerWorkQueueRow =
  | { type: "section"; id: string; title: string; sectionId: FarmerWorkSectionId }
  | { type: "farmer"; id: string; farmer: MobileFarmer; workflow: FarmerWorkflowMeta; sectionId: FarmerWorkSectionId };

const SECTION_TITLES: Record<FarmerWorkSectionId, string> = {
  never_visited: "Never Visited",
  recently_visited: "Recently Visited",
  all_farmers: "All Farmers"
};

const SECTION_ORDER: FarmerWorkSectionId[] = ["never_visited", "recently_visited", "all_farmers"];

const RECENTLY_VISITED_DAYS = 14;

function parseDate(iso: string): Date | null {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysSince(iso: string, ref = new Date()): number {
  const then = parseDate(iso);
  if (!then) return 0;
  const ms = startOfLocalDay(ref).getTime() - startOfLocalDay(then).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function formatLastVisitDateLabel(farmer: MobileFarmer): string | null {
  const visits = farmerVisitCount(farmer);
  if (visits === 0) return "Never visited";
  const raw = farmerLastVisitDate(farmer);
  if (!raw) return null;
  const d = parseDate(raw);
  if (!d) return null;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function buildFarmerWorkflowMeta(farmer: MobileFarmer): FarmerWorkflowMeta {
  return {
    lastVisitDateLabel: formatLastVisitDateLabel(farmer)
  };
}

export function assignFarmerWorkSection(farmer: MobileFarmer, ref = new Date()): FarmerWorkSectionId {
  if (farmerVisitCount(farmer) === 0 || !farmerLastVisitDate(farmer)) {
    return "never_visited";
  }
  const last = farmerLastVisitDate(farmer);
  if (last && daysSince(last, ref) <= RECENTLY_VISITED_DAYS) {
    return "recently_visited";
  }
  return "all_farmers";
}

function sortFarmersByRecency(a: MobileFarmer, b: MobileFarmer) {
  const aLast = farmerLastVisitDate(a);
  const bLast = farmerLastVisitDate(b);
  if (!aLast && !bLast) return (a.name || "").localeCompare(b.name || "");
  if (!aLast) return 1;
  if (!bLast) return -1;
  return parseDate(bLast)!.getTime() - parseDate(aLast)!.getTime();
}

export function farmerVillageName(farmer: VillageNameSource): string {
  return String(farmer.village_name || farmer.village || "").trim();
}

export function farmerMatchesVillageName(farmer: MobileFarmer, villageName: string): boolean {
  const needle = villageName.trim().toLowerCase();
  if (!needle) return true;
  return farmerVillageName(farmer).toLowerCase() === needle;
}

export function buildVillageQuickFilterNames(
  farmers: MobileFarmer[],
  recentSources: VillageNameSource[],
  limit = 10
): string[] {
  const counts = new Map<string, number>();

  for (const source of recentSources) {
    const name = farmerVillageName(source);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 3);
  }
  for (const farmer of farmers) {
    const name = farmerVillageName(farmer);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

export function enrichFarmerFromPool<T extends { id?: number | null }>(
  farmer: T,
  pool: MobileFarmer[]
): MobileFarmer {
  if (farmer.id == null) return farmer as MobileFarmer;
  const match = pool.find((row) => row.id === farmer.id);
  return match ? { ...farmer, ...match } : (farmer as MobileFarmer);
}

export function buildFarmerWorkQueueRows(farmers: MobileFarmer[], ref = new Date()): FarmerWorkQueueRow[] {
  const buckets: Record<FarmerWorkSectionId, MobileFarmer[]> = {
    never_visited: [],
    recently_visited: [],
    all_farmers: []
  };

  for (const farmer of farmers) {
    buckets[assignFarmerWorkSection(farmer, ref)].push(farmer);
  }

  const rows: FarmerWorkQueueRow[] = [];
  for (const sectionId of SECTION_ORDER) {
    const sectionFarmers = [...buckets[sectionId]].sort(sortFarmersByRecency);
    if (sectionFarmers.length === 0) continue;
    rows.push({
      type: "section",
      id: `section-${sectionId}`,
      title: SECTION_TITLES[sectionId],
      sectionId
    });
    for (const farmer of sectionFarmers) {
      rows.push({
        type: "farmer",
        id: `farmer-${farmer.id}`,
        farmer,
        workflow: buildFarmerWorkflowMeta(farmer),
        sectionId
      });
    }
  }
  return rows;
}

export function paginateWorkQueueRows(rows: FarmerWorkQueueRow[], farmerWindow: number): FarmerWorkQueueRow[] {
  let farmerCount = 0;
  const out: FarmerWorkQueueRow[] = [];
  let pendingSection: FarmerWorkQueueRow | null = null;

  for (const row of rows) {
    if (row.type === "section") {
      pendingSection = row;
      continue;
    }
    if (farmerCount >= farmerWindow) continue;
    if (pendingSection) {
      out.push(pendingSection);
      pendingSection = null;
    }
    out.push(row);
    farmerCount += 1;
  }

  return out;
}

export function countWorkQueueFarmers(rows: FarmerWorkQueueRow[]): number {
  return rows.filter((row) => row.type === "farmer").length;
}
