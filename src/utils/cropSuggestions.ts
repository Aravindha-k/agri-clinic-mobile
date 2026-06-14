import type { MasterOption } from "../api/masters";
import { getOptionLabel } from "../api/masters";
import type { Visit } from "../api/visits";
import { extractCropIdFromVisit, cropLabelFromVisit } from "./farmerPrefill";

export type CropSuggestion = {
  id: string;
  label: string;
  source: "recent" | "frequent" | "farmer";
};

function visitCropId(visit: Visit): string {
  return extractCropIdFromVisit(visit);
}

export function buildCropSuggestions(options: {
  crops: MasterOption[];
  visits?: Visit[];
  farmerCropName?: string | null;
  limit?: number;
}): { recent: CropSuggestion[]; frequent: CropSuggestion[] } {
  const { crops, visits = [], farmerCropName, limit = 6 } = options;
  const byId = new Map(crops.map((c) => [String(c.id), c]));
  const freq = new Map<string, number>();
  const recentIds: string[] = [];
  const seenRecent = new Set<string>();

  const sorted = [...visits].sort((a, b) => {
    const ta = new Date(a.visit_date || a.created_at || 0).getTime();
    const tb = new Date(b.visit_date || b.created_at || 0).getTime();
    return tb - ta;
  });

  for (const visit of sorted) {
    const id = visitCropId(visit);
    if (!id || !byId.has(id)) continue;
    freq.set(id, (freq.get(id) ?? 0) + 1);
    if (!seenRecent.has(id)) {
      seenRecent.add(id);
      recentIds.push(id);
    }
  }

  if (farmerCropName?.trim()) {
    const match = crops.find((c) => getOptionLabel(c).toLowerCase() === farmerCropName.trim().toLowerCase());
    if (match && !seenRecent.has(String(match.id))) {
      recentIds.unshift(String(match.id));
    }
  }

  const toSuggestion = (id: string, source: CropSuggestion["source"]): CropSuggestion | null => {
    const crop = byId.get(id);
    if (!crop) return null;
    return { id, label: getOptionLabel(crop), source };
  };

  const recent = recentIds
    .slice(0, limit)
    .map((id) => toSuggestion(id, id === recentIds[0] && farmerCropName ? "farmer" : "recent"))
    .filter((x): x is CropSuggestion => Boolean(x));

  const frequent = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .filter((id) => !recentIds.slice(0, 3).includes(id))
    .slice(0, limit)
    .map((id) => toSuggestion(id, "frequent"))
    .filter((x): x is CropSuggestion => Boolean(x));

  return { recent, frequent };
}

export function extractRecommendationSuggestions(visits: Visit[], limit = 5): string[] {
  const seen = new Set<string>();
  const rows: string[] = [];
  const sorted = [...visits].sort((a, b) => {
    const ta = new Date(a.visit_date || a.created_at || 0).getTime();
    const tb = new Date(b.visit_date || b.created_at || 0).getTime();
    return tb - ta;
  });

  for (const visit of sorted) {
    for (const text of [
      visit.action_taken,
      visit.recommendation,
      visit.general_advice,
      visit.fertilizer_advice,
      visit.pesticide_advice
    ]) {
      const line = text?.trim();
      if (!line || seen.has(line)) continue;
      seen.add(line);
      rows.push(line);
      if (rows.length >= limit) return rows;
    }
  }

  return rows;
}
