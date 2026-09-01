import type { Visit } from "../../src/api/visits";
import type { AppLanguage } from "../../src/i18n";
import {
  pendingVisitValuesMatchSearch,
  visitMatchesSearch
} from "../../src/utils/visitSearch";
import { isSameLocalDay, visitDisplayIso } from "../../src/utils/format";
import {
  formatIndiaWeekdayDateShort,
  indiaCalendarDate
} from "../../src/utils/indiaDateTime";
import type { PendingVisitRecord } from "./pendingVisitsQueue";

function sectionTitleForDate(date: Date, ref: Date, language: AppLanguage, labels: VisitListLabels) {
  const yesterday = new Date(ref.getTime() - 24 * 60 * 60 * 1000);
  if (isSameLocalDay(date.toISOString(), ref)) return labels.today;
  if (isSameLocalDay(date.toISOString(), yesterday)) return labels.yesterday;
  void language;
  return formatIndiaWeekdayDateShort(date).toUpperCase().replace(/\./g, "");
}

export type VisitListLabels = {
  today: string;
  yesterday: string;
  pendingSync: string;
  unknownDate: string;
};

function dayKey(iso: string | null) {
  if (!iso) return "unknown";
  return indiaCalendarDate(iso) ?? iso.slice(0, 10);
}


export function pendingMatchesSearch(pending: PendingVisitRecord, query: string) {
  return pendingVisitValuesMatchSearch(pending.values, query);
}

export { visitMatchesSearch };

export function buildVisitListRows(
  pending: PendingVisitRecord[],
  visits: Visit[],
  searchQuery: string,
  labels: VisitListLabels,
  language: AppLanguage
): VisitListRow[] {
  const rows: VisitListRow[] = [];
  const q = searchQuery.trim();

  const pendingRows = pending.filter((p) => pendingMatchesSearch(p, q));
  if (pendingRows.length) {
    rows.push({ kind: "section", id: "section-pending", title: labels.pendingSync });
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
      const title = iso ? sectionTitleForDate(new Date(iso), ref, language, labels) : labels.unknownDate;
      rows.push({ kind: "section", id: `section-${key}`, title });
    }
    rows.push({ kind: "visit", id: `visit-${visit.id}`, visit });
  }

  return rows;
}

export type VisitListRow =
  | { kind: "section"; id: string; title: string }
  | { kind: "pending"; id: string; pending: PendingVisitRecord }
  | { kind: "visit"; id: string; visit: Visit };

export function stickySectionIndices(rows: VisitListRow[]) {
  return rows
    .map((row, index) => (row.kind === "section" ? index : -1))
    .filter((index) => index >= 0);
}
