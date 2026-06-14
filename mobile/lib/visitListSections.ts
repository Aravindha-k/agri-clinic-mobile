import type { Visit } from "../../src/api/visits";
import { isSameLocalDay, visitDisplayIso } from "../../src/utils/format";
import type { PendingVisitRecord } from "./pendingVisitsQueue";

export type VisitListRow =
  | { kind: "section"; id: string; title: string }
  | { kind: "pending"; id: string; pending: PendingVisitRecord }
  | { kind: "visit"; id: string; visit: Visit };

function sectionTitleForDate(date: Date, ref: Date) {
  const yesterday = new Date(ref);
  yesterday.setDate(ref.getDate() - 1);
  if (isSameLocalDay(date.toISOString(), ref)) return "TODAY";
  if (isSameLocalDay(date.toISOString(), yesterday)) return "YESTERDAY";
  return date
    .toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase()
    .replace(/\./g, "");
}

function dayKey(iso: string | null) {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function pendingMatchesSearch(pending: PendingVisitRecord, query: string) {
  if (!query.trim()) return true;
  const v = pending.values;
  const hay = [v.farmer_name, v.farmer_phone, v.crop_name, v.problem_seen, v.village]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query.trim().toLowerCase());
}

export function visitMatchesSearch(visit: Visit, query: string) {
  if (!query.trim()) return true;
  const hay = [
    visit.farmer_name,
    visit.farmer_phone,
    visit.village_name,
    visit.crop_name,
    visit.problem_seen,
    visit.field_visit?.problem_category?.code,
    visit.field_visit?.problem_category?.name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query.trim().toLowerCase());
}

export function buildVisitListRows(
  pending: PendingVisitRecord[],
  visits: Visit[],
  searchQuery: string
): VisitListRow[] {
  const rows: VisitListRow[] = [];
  const q = searchQuery.trim();

  const pendingRows = pending.filter((p) => pendingMatchesSearch(p, q));
  if (pendingRows.length) {
    rows.push({ kind: "section", id: "section-pending", title: "PENDING SYNC" });
    for (const item of pendingRows) {
      rows.push({ kind: "pending", id: `pending-${item.id}`, pending: item });
    }
  }

  const filtered = visits.filter((v) => visitMatchesSearch(v, q));
  const ref = new Date();
  let lastDay = "";

  for (const visit of filtered) {
    const iso = visitDisplayIso(visit);
    const key = dayKey(iso);
    if (key !== lastDay) {
      lastDay = key;
      const title = iso ? sectionTitleForDate(new Date(iso), ref) : "UNKNOWN DATE";
      rows.push({ kind: "section", id: `section-${key}`, title });
    }
    rows.push({ kind: "visit", id: `visit-${visit.id}`, visit });
  }

  return rows;
}

export function stickySectionIndices(rows: VisitListRow[]) {
  return rows
    .map((row, index) => (row.kind === "section" ? index : -1))
    .filter((index) => index >= 0);
}
