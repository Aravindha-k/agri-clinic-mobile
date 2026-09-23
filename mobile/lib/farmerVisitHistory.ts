import type { Visit } from "../../src/api/visits";
import { visitDisplayIso } from "../../src/utils/format";
import { formatIndiaDate, formatIndiaTime } from "../../src/utils/indiaDateTime";
import { cropLabelFromVisit } from "../../src/utils/farmerPrefill";
import { collectVisitProblems } from "../../src/utils/visitProblems";

export type FarmerVisitHistoryRow = {
  id: number;
  date: string;
  time: string;
  crop: string;
  problems: string;
  status: string;
  village: string;
};

export function visitHistoryTimestamp(visit: Visit): number {
  const iso = visitDisplayIso(visit);
  const ms = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

export function sortVisitsNewestFirst(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => {
    const delta = visitHistoryTimestamp(b) - visitHistoryTimestamp(a);
    if (delta !== 0) return delta;
    return Number(b.id) - Number(a.id);
  });
}

function visitStatusLabel(visit: Visit): string {
  const raw = typeof visit.status === "string" ? visit.status.trim() : "";
  if (raw) return raw;
  return visit.id != null ? "Submitted" : "";
}

function visitVillageLabel(visit: Visit): string {
  const nested = visit.farmer && typeof visit.farmer === "object" ? visit.farmer.village : "";
  const raw = [visit.village_name, visit.farmer_village, nested]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find((value) => value && !/^\d+$/.test(value));
  return raw || "";
}

function visitProblemsLabel(visit: Visit): string {
  const items = collectVisitProblems(visit)
    .map((item) => item.tamil_name || item.name)
    .filter(Boolean);
  if (items.length) return items.join(", ");
  return (
    visit.problem_seen?.trim() ||
    visit.problem_description?.trim() ||
    visit.field_visit?.problem_master?.name ||
    visit.field_visit?.problem_category?.name ||
    ""
  );
}

/** Display fields actually present on a Visit — omit empty values in the UI. */
export function farmerVisitHistoryRow(visit: Visit): FarmerVisitHistoryRow {
  const iso = visitDisplayIso(visit);
  const date = iso ? formatIndiaDate(iso) : "";
  const time = iso ? formatIndiaTime(iso) : visit.visit_time?.trim() || "";
  return {
    id: Number(visit.id),
    date: date && date !== "—" ? date : "",
    time: time && time !== "—" ? time : "",
    crop: cropLabelFromVisit(visit) || "",
    problems: visitProblemsLabel(visit),
    status: visitStatusLabel(visit),
    village: visitVillageLabel(visit)
  };
}

/**
 * Current mobile rule: field-notes PATCH exists for a persisted server Visit.
 * Honor an explicit can_edit=false from the API; do not add extra locks.
 */
export function visitAllowsNotesUpdate(visit: { id?: unknown; can_edit?: unknown } | null | undefined): boolean {
  if (!visit) return false;
  if (visit.can_edit === false) return false;
  const id = Number(visit.id);
  return Number.isFinite(id) && id > 0;
}
