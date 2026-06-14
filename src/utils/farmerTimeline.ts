import { Ionicons } from "@expo/vector-icons";
import type { Visit } from "../api/visits";
import { getVisitDisplayDateTime } from "./format";
import { cropLabelFromVisit } from "./farmerPrefill";

export type FarmerTimelineEvent = {
  id: string;
  type: "visit" | "recommendation" | "issue" | "activity";
  title: string;
  subtitle?: string;
  timestamp: number;
  dateLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function visitTs(visit: Visit): number {
  const raw = visit.visit_date || visit.created_at || visit.updated_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function activityTs(item: Record<string, unknown>): number {
  const raw = item.created_at || item.recorded_at || item.date || item.timestamp;
  if (typeof raw !== "string") return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function visitSummary(visit: Visit): string {
  const crop = cropLabelFromVisit(visit);
  const problem = visit.problem_seen || visit.problem_description || visit.field_notes || visit.observation;
  const bits = [crop, problem].filter(Boolean);
  return bits.join(" · ") || "Field visit logged";
}

export function buildFarmerTimeline(visits: Visit[], activity: unknown[]): FarmerTimelineEvent[] {
  const events: FarmerTimelineEvent[] = [];

  for (const visit of visits) {
    const ts = visitTs(visit);
    const dateLabel = getVisitDisplayDateTime(visit) || "—";
    events.push({
      id: `visit-${visit.id}`,
      type: "visit",
      title: "Visit completed",
      subtitle: visitSummary(visit),
      timestamp: ts,
      dateLabel,
      icon: "checkmark-circle-outline"
    });

    const advice =
      visit.action_taken?.trim() ||
      visit.recommendation?.trim() ||
      visit.general_advice?.trim() ||
      visit.fertilizer_advice?.trim() ||
      visit.pesticide_advice?.trim();
    if (advice) {
      events.push({
        id: `rec-${visit.id}`,
        type: "recommendation",
        title: "Recommendation given",
        subtitle: advice,
        timestamp: ts,
        dateLabel,
        icon: "medkit-outline"
      });
    }

    if (visit.pest_issue || visit.disease_issue || visit.follow_up_required) {
      const issueBits = [
        visit.pest_issue ? "Pest issue" : null,
        visit.disease_issue ? "Disease issue" : null,
        visit.follow_up_required ? "Follow-up required" : null
      ].filter(Boolean);
      events.push({
        id: `issue-${visit.id}`,
        type: "issue",
        title: "Issue reported",
        subtitle: issueBits.join(" · "),
        timestamp: ts,
        dateLabel,
        icon: "alert-circle-outline"
      });
    }
  }

  for (let i = 0; i < activity.length; i += 1) {
    const row = activity[i];
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const ts = activityTs(r);
    const title = String(r.activity_type || r.title || r.name || "Activity");
    const subtitle = String(r.notes || r.description || r.summary || "").trim() || undefined;
    events.push({
      id: `act-${i}-${ts}`,
      type: "activity",
      title,
      subtitle,
      timestamp: ts,
      dateLabel: ts ? getVisitDisplayDateTime({ created_at: new Date(ts).toISOString() }) : "—",
      icon: "pulse-outline"
    });
  }

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

export function countOpenIssues(visits: Visit[]): number {
  return visits.filter((v) => v.follow_up_required || v.pest_issue || v.disease_issue).length;
}

export function extractRecommendations(visits: Visit[]): { id: string; text: string; dateLabel: string }[] {
  const seen = new Set<string>();
  const rows: { id: string; text: string; dateLabel: string; ts: number }[] = [];

  for (const visit of visits) {
    const text =
      visit.action_taken?.trim() ||
      visit.recommendation?.trim() ||
      visit.general_advice?.trim() ||
      visit.fertilizer_advice?.trim() ||
      visit.pesticide_advice?.trim() ||
      visit.irrigation_advice?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    rows.push({
      id: `rec-${visit.id}`,
      text,
      dateLabel: getVisitDisplayDateTime(visit) || "—",
      ts: visitTs(visit)
    });
  }

  return rows.sort((a, b) => b.ts - a.ts).map(({ id, text, dateLabel }) => ({ id, text, dateLabel }));
}
