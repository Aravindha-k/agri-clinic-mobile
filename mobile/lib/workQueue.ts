import type { MobileFarmer } from "./farmersApi";
import {
  farmerLastVisitDate,
  farmerVisitCount,
  isFollowUpDue,
  isFollowUpDueToday,
  isFollowUpOverdue
} from "./farmerStatus";
import { formatIndiaDate, indiaCalendarDate, parseServerInstant } from "../../src/utils/indiaDateTime";

export type VisitPriorityLabel = "Overdue" | "Today" | "Routine";

export type FarmerWorkflowMeta = {
  priorityScore: number;
  priorityLabel: VisitPriorityLabel;
  lastVisitDateLabel: string | null;
  showFollowUpBadge: boolean;
};

export type FarmerPickRow = {
  farmer: MobileFarmer;
  workflow: FarmerWorkflowMeta;
};

export type VillageNameSource = {
  village_name?: string | null;
  village?: string | number | null;
};

export type FarmerWorkSectionId = "follow_ups_today" | "recently_visited" | "all_farmers";

export type FarmerWorkQueueRow =
  | {
      type: "section";
      id: string;
      title: string;
      sectionId: FarmerWorkSectionId;
      count: number;
      collapsible?: boolean;
      collapsed?: boolean;
    }
  | { type: "empty"; id: string; sectionId: FarmerWorkSectionId; message: string }
  | { type: "farmer"; id: string; farmer: MobileFarmer; workflow: FarmerWorkflowMeta; sectionId: FarmerWorkSectionId };

const SECTION_TITLES: Record<FarmerWorkSectionId, string> = {
  follow_ups_today: "Today's Follow Ups",
  recently_visited: "Recently Visited",
  all_farmers: "All Farmers"
};

const SECTION_ORDER: FarmerWorkSectionId[] = ["follow_ups_today", "recently_visited", "all_farmers"];

export const WORK_SECTION_I18N: Record<FarmerWorkSectionId, string> = {
  follow_ups_today: "work.sectionFollowUps",
  recently_visited: "work.sectionRecentlyVisited",
  all_farmers: "work.sectionAllFarmers"
};

const RECENTLY_VISITED_DAYS = 14;

function parseDate(iso: string): Date | null {
  return parseServerInstant(iso.includes("T") ? iso : iso);
}

function calendarDayDiff(a: Date, b: Date): number {
  const aKey = indiaCalendarDate(a);
  const bKey = indiaCalendarDate(b);
  if (!aKey || !bKey) return 0;
  const aMs = Date.parse(`${aKey}T12:00:00Z`);
  const bMs = Date.parse(`${bKey}T12:00:00Z`);
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0;
  return Math.floor((bMs - aMs) / 86_400_000);
}

function daysSince(iso: string, ref = new Date()): number {
  const then = parseDate(iso);
  if (!then) return 0;
  return Math.max(0, calendarDayDiff(then, ref));
}

function followUpOverdueDays(farmer: MobileFarmer, ref = new Date()): number {
  const raw = farmer.follow_up_date ?? farmer.next_follow_up_date;
  if (!raw) return isFollowUpOverdue(farmer, ref) ? 1 : 0;
  const due = parseDate(raw);
  if (!due) return 0;
  return Math.max(0, calendarDayDiff(due, ref));
}

export function formatLastVisitDateLabel(
  farmer: MobileFarmer,
  options?: { neverLabel?: string; locale?: string }
): string | null {
  const visits = farmerVisitCount(farmer);
  if (visits === 0) return options?.neverLabel ?? "Never visited";
  const raw = farmerLastVisitDate(farmer);
  if (!raw) return null;
  void options?.locale;
  const label = formatIndiaDate(raw);
  return label === "—" ? null : label;
}

export function computePriorityScore(farmer: MobileFarmer, ref = new Date()): number {
  const overdueDays = followUpOverdueDays(farmer, ref);
  const followUpToday = isFollowUpDueToday(farmer, ref) ? 1 : 0;
  const neverVisited = farmerVisitCount(farmer) === 0 ? 1 : 0;
  return overdueDays * 10 + followUpToday * 8 + neverVisited * 3;
}

export function priorityLabelForScore(
  farmer: MobileFarmer,
  score: number,
  ref = new Date()
): VisitPriorityLabel {
  if (isFollowUpOverdue(farmer, ref) || score >= 20) return "Overdue";
  if (isFollowUpDueToday(farmer, ref) || score >= 8) return "Today";
  return "Routine";
}

export function buildFarmerWorkflowMeta(
  farmer: MobileFarmer,
  ref = new Date(),
  localeOptions?: { neverLabel?: string; locale?: string }
): FarmerWorkflowMeta {
  const priorityScore = computePriorityScore(farmer, ref);
  return {
    priorityScore,
    priorityLabel: priorityLabelForScore(farmer, priorityScore, ref),
    lastVisitDateLabel: formatLastVisitDateLabel(farmer, localeOptions),
    showFollowUpBadge: isFollowUpDue(farmer, ref)
  };
}

export function assignFarmerWorkSection(farmer: MobileFarmer, ref = new Date()): FarmerWorkSectionId {
  if (isFollowUpDue(farmer, ref)) {
    return "follow_ups_today";
  }
  const last = farmerLastVisitDate(farmer);
  if (last && farmerVisitCount(farmer) > 0 && daysSince(last, ref) <= RECENTLY_VISITED_DAYS) {
    return "recently_visited";
  }
  return "all_farmers";
}

function sortFarmersByPriority(a: MobileFarmer, b: MobileFarmer, ref = new Date()) {
  return computePriorityScore(b, ref) - computePriorityScore(a, ref);
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

export type BuildWorkQueueOptions = {
  sectionTitle?: (sectionId: FarmerWorkSectionId, count: number) => string;
  emptyMessage?: (sectionId: FarmerWorkSectionId) => string | null;
  collapsedSections?: ReadonlySet<FarmerWorkSectionId>;
  localeOptions?: { neverLabel?: string; locale?: string };
};

export function buildFarmerDirectoryRows(
  farmers: MobileFarmer[],
  ref = new Date(),
  options?: BuildWorkQueueOptions
): FarmerWorkQueueRow[] {
  const locale = options?.localeOptions?.locale;
  const collator = new Intl.Collator(locale);
  const sorted = [...farmers].sort(
    (a, b) => collator.compare(a.name || "", b.name || "") || a.id - b.id
  );

  // Phase 1: hide follow-up section (FOLLOW_UP_DECISION.md). Keep sorting by name only.
  const followUps: MobileFarmer[] = [];
  const followUpIds = new Set<number>();
  const directoryFarmers = sorted;

  const rows: FarmerWorkQueueRow[] = [];

  if (followUps.length > 0) {
    const title = options?.sectionTitle
      ? options.sectionTitle("follow_ups_today", followUps.length)
      : `${SECTION_TITLES.follow_ups_today} (${followUps.length})`;
    rows.push({
      type: "section",
      id: "section-follow_ups_today",
      title,
      sectionId: "follow_ups_today",
      count: followUps.length,
      collapsible: false,
      collapsed: false
    });
    for (const farmer of followUps) {
      rows.push({
        type: "farmer",
        id: `farmer-${farmer.id}`,
        farmer,
        workflow: buildFarmerWorkflowMeta(farmer, ref, options?.localeOptions),
        sectionId: "follow_ups_today"
      });
    }
  }

  const allTitle = options?.sectionTitle
    ? options.sectionTitle("all_farmers", sorted.length)
    : `${SECTION_TITLES.all_farmers} (${sorted.length})`;

  rows.push({
    type: "section",
    id: "section-all_farmers",
    title: allTitle,
    sectionId: "all_farmers",
    count: sorted.length,
    collapsible: false,
    collapsed: false
  });

  if (directoryFarmers.length === 0 && followUps.length === 0) {
    const message = options?.emptyMessage?.("all_farmers");
    if (message) {
      rows.push({
        type: "empty",
        id: "empty-all_farmers",
        sectionId: "all_farmers",
        message
      });
    }
    return rows;
  }

  for (const farmer of directoryFarmers) {
    rows.push({
      type: "farmer",
      id: `farmer-${farmer.id}`,
      farmer,
      workflow: buildFarmerWorkflowMeta(farmer, ref, options?.localeOptions),
      sectionId: "all_farmers"
    });
  }

  return rows;
}

export function buildFarmerWorkQueueRows(
  farmers: MobileFarmer[],
  ref = new Date(),
  options?: BuildWorkQueueOptions
): FarmerWorkQueueRow[] {
  const buckets: Record<FarmerWorkSectionId, MobileFarmer[]> = {
    follow_ups_today: [],
    recently_visited: [],
    all_farmers: []
  };

  for (const farmer of farmers) {
    buckets[assignFarmerWorkSection(farmer, ref)].push(farmer);
  }

  const rows: FarmerWorkQueueRow[] = [];
  for (const sectionId of SECTION_ORDER) {
    const sectionFarmers = [...buckets[sectionId]].sort((a, b) => sortFarmersByPriority(a, b, ref));
    const count = sectionFarmers.length;
    if (sectionId === "follow_ups_today" && count === 0) {
      continue;
    }
    const collapsed = options?.collapsedSections?.has(sectionId) ?? false;
    const title = options?.sectionTitle
      ? options.sectionTitle(sectionId, count)
      : `${SECTION_TITLES[sectionId]} (${count})`;

    rows.push({
      type: "section",
      id: `section-${sectionId}`,
      title,
      sectionId,
      count,
      collapsible: sectionId === "all_farmers",
      collapsed: sectionId === "all_farmers" ? collapsed : false
    });

    if (count === 0) {
      const message = options?.emptyMessage?.(sectionId);
      if (message) {
        rows.push({
          type: "empty",
          id: `empty-${sectionId}`,
          sectionId,
          message
        });
      }
      continue;
    }

    if (collapsed) {
      continue;
    }

    for (const farmer of sectionFarmers) {
      rows.push({
        type: "farmer",
        id: `farmer-${farmer.id}`,
        farmer,
        workflow: buildFarmerWorkflowMeta(farmer, ref, options?.localeOptions),
        sectionId
      });
    }
  }
  return rows;
}

export function paginateWorkQueueRows(rows: FarmerWorkQueueRow[], farmerWindow: number): FarmerWorkQueueRow[] {
  let farmerCount = 0;
  const out: FarmerWorkQueueRow[] = [];

  for (const row of rows) {
    if (row.type === "section" || row.type === "empty") {
      out.push(row);
      continue;
    }
    if (farmerCount >= farmerWindow) {
      continue;
    }
    out.push(row);
    farmerCount += 1;
  }

  return out;
}

export function countWorkQueueFarmers(rows: FarmerWorkQueueRow[]): number {
  return rows.filter((row) => row.type === "farmer").length;
}

export function pickTodaysFollowUps(farmers: MobileFarmer[], ref = new Date(), limit = 8): FarmerPickRow[] {
  return farmers
    .filter((farmer) => isFollowUpDue(farmer, ref))
    .sort((a, b) => sortFarmersByPriority(a, b, ref))
    .slice(0, limit)
    .map((farmer) => ({ farmer, workflow: buildFarmerWorkflowMeta(farmer, ref) }));
}

export function pickSuggestedFarmers(
  farmers: MobileFarmer[],
  excludeIds: Set<number>,
  ref = new Date(),
  limit = 10
): FarmerPickRow[] {
  const suggested = farmers.filter((farmer) => {
    if (excludeIds.has(farmer.id)) return false;
    if (isFollowUpDue(farmer, ref)) return false;
    if (farmerVisitCount(farmer) === 0) return true;
    return false;
  });

  return suggested
    .sort((a, b) => sortFarmersByPriority(a, b, ref))
    .slice(0, limit)
    .map((farmer) => ({ farmer, workflow: buildFarmerWorkflowMeta(farmer, ref) }));
}
