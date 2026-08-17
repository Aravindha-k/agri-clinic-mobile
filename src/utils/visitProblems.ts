import type { ProblemItem } from "../api/problems";
import type { Visit } from "../api/visits";
import { problemItemMatchesCrop } from "./problemItemFilter";

export type VisitProblemDisplay = {
  id: number | string;
  name: string;
  tamil_name?: string | null;
  categoryName?: string;
  categoryCode?: string;
};

function asProblemList(value: unknown): VisitProblemDisplay[] {
  if (!Array.isArray(value)) return [];
  const out: VisitProblemDisplay[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = row.id != null ? String(row.id) : "";
    const name = String(row.name || row.tamil_name || "").trim();
    if (!id && !name) continue;
    const key = id || name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const category =
      row.category && typeof row.category === "object"
        ? (row.category as { name?: string; code?: string })
        : null;
    out.push({
      id: id || name,
      name: name || `#${id}`,
      tamil_name: typeof row.tamil_name === "string" ? row.tamil_name : null,
      categoryName: category?.name,
      categoryCode: category?.code
    });
  }
  return out;
}

/** All problems for Visit Detail. Prefer problems[]; fall back to legacy single fields. Dedupe. */
export function collectVisitProblems(visit: Partial<Visit> | null | undefined): VisitProblemDisplay[] {
  if (!visit) return [];
  const fromArray = asProblemList(visit.problems);
  if (fromArray.length) return fromArray;

  const nested = visit.field_visit?.problem_master;
  const legacyId = visit.problem_master_id ?? nested?.id;
  const tamil = nested?.tamil_name || visit.problem_seen || visit.problem_description;
  const english = nested?.name || visit.problem_description || visit.problem_seen;
  const name = String(english || tamil || "").trim();
  if (!legacyId && !name) return [];
  return [
    {
      id: legacyId ?? name,
      name: name || `#${legacyId}`,
      tamil_name: tamil || null,
      categoryName: visit.field_visit?.problem_category?.name,
      categoryCode: visit.field_visit?.problem_category?.code
    }
  ];
}

export function problemItemIdsFromSelection(items: ProblemItem[]): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const item of items) {
    const id = Number(item.id);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function revalidateProblemSelection(
  selected: ProblemItem[],
  cropId: string
): { kept: ProblemItem[]; removed: ProblemItem[] } {
  const kept: ProblemItem[] = [];
  const removed: ProblemItem[] = [];
  for (const item of selected) {
    if (problemItemMatchesCrop(item, cropId)) kept.push(item);
    else removed.push(item);
  }
  return { kept, removed };
}

export function displayProblemLabel(item: { name?: string | null; tamil_name?: string | null }, language: "en" | "ta") {
  const tamil = item.tamil_name?.trim();
  const english = item.name?.trim();
  if (language === "ta") return tamil || english || "";
  return english || tamil || "";
}
