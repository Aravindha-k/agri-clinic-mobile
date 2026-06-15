import { apiClient } from "../../src/api/client";
import { fetchCurrentWorkday } from "../../src/api/tracking";
import { resolveWorkdayStartedAt } from "../../src/utils/workdayStartedAt";
import type { Visit } from "../../src/api/visits";
import { isSameVisitLocalDay, visitDisplayIso } from "../../src/utils/format";
import { cropLabelFromVisit } from "../../src/utils/farmerPrefill";
import { getHomeVisits } from "../../src/utils/visitsCache";
import { readDashboardCache, writeDashboardCache } from "./dashboardCache";
import type { DashboardData, DashboardFollowUp, DashboardRecentVisit, MobileWorkStatus } from "./types";

function startOfLocalDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysBetween(due: Date, today: Date) {
  const ms = startOfLocalDay(today).getTime() - startOfLocalDay(due).getTime();
  return Math.floor(ms / 86_400_000);
}

function problemFromVisit(visit: Visit): string {
  const master = visit.field_visit?.problem_master?.name || visit.field_visit?.problem_category?.name;
  if (master?.trim()) return master.trim();
  if (visit.problem_seen?.trim()) return visit.problem_seen.trim();
  if (visit.pest_issue) return "Pest issue";
  if (visit.disease_issue) return "Disease issue";
  return "Follow-up";
}

function farmerNameFromVisit(visit: Visit): string {
  return visit.farmer_name || visit.farmer?.name || "Farmer";
}

function normalizeFollowUp(raw: Record<string, unknown>): DashboardFollowUp | null {
  const id = raw.id ?? raw.visit_id;
  const farmerName = String(raw.farmer_name ?? raw.farmer ?? "").trim();
  if (!id || !farmerName) return null;
  const daysOverdue = Number(raw.days_overdue ?? 0);
  return {
    id: typeof id === "number" ? id : String(id),
    farmer_id: typeof raw.farmer_id === "number" ? raw.farmer_id : undefined,
    farmer_name: farmerName,
    crop: typeof raw.crop === "string" ? raw.crop : typeof raw.crop_name === "string" ? raw.crop_name : undefined,
    problem: typeof raw.problem === "string" ? raw.problem : undefined,
    follow_up_date: typeof raw.follow_up_date === "string" ? raw.follow_up_date : null,
    days_overdue: Number.isFinite(daysOverdue) ? daysOverdue : 0,
    due_today: Boolean(raw.due_today) || daysOverdue === 0,
    visit_id: typeof raw.visit_id === "number" ? raw.visit_id : typeof id === "number" ? id : undefined
  };
}

function parseRecentId(raw: Record<string, unknown>): number | null {
  const idRaw = raw.id ?? raw.visit_id;
  if (typeof idRaw === "number" && Number.isFinite(idRaw)) return idRaw;
  if (typeof idRaw === "string" && idRaw.trim()) {
    const parsed = Number(idRaw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeRecent(raw: Record<string, unknown>): DashboardRecentVisit | null {
  const id = parseRecentId(raw);
  const farmerRaw = raw.farmer_name ?? raw.farmer;
  const farmerName =
    typeof farmerRaw === "string"
      ? farmerRaw.trim()
      : farmerRaw && typeof farmerRaw === "object"
        ? String((farmerRaw as { name?: string }).name ?? "").trim()
        : String(raw.name ?? "").trim();
  if (id == null || !farmerName) return null;
  return {
    id,
    farmer_name: farmerName,
    crop:
      typeof raw.crop === "string"
        ? raw.crop
        : typeof raw.crop_name === "string"
          ? raw.crop_name
          : undefined,
    visited_at:
      typeof raw.visited_at === "string"
        ? raw.visited_at
        : typeof raw.visit_date === "string"
          ? raw.visit_date
          : typeof raw.created_at === "string"
            ? raw.created_at
            : null
  };
}

/** When the dashboard API omits recent visits, fill from the visits list. */
function mergeDashboard(api: DashboardData, fromVisits: DashboardData | null): DashboardData {
  if (!fromVisits) return api;

  const recent = api.recent_visits.length > 0 ? api.recent_visits : fromVisits.recent_visits;

  return {
    visits_today: Math.max(api.visits_today, fromVisits.visits_today),
    farmers_covered: Math.max(api.farmers_covered, fromVisits.farmers_covered),
    follow_ups_due: api.follow_ups_due || fromVisits.follow_ups_due,
    follow_ups: api.follow_ups.length > 0 ? api.follow_ups : fromVisits.follow_ups,
    recent_visits: recent
  };
}

function buildFollowUpsFromVisits(visits: Visit[]): DashboardFollowUp[] {
  const today = new Date();
  const items: DashboardFollowUp[] = [];

  for (const visit of visits) {
    const dueRaw = visit.follow_up_date || visit.next_visit_date;
    if (!dueRaw && !visit.follow_up_required) continue;

    let daysOverdue = 0;
    let dueToday = false;
    if (dueRaw) {
      const due = new Date(dueRaw);
      if (!Number.isNaN(due.getTime())) {
        daysOverdue = daysBetween(due, today);
        dueToday = daysOverdue === 0;
        if (daysOverdue < 0) continue;
      }
    } else if (!visit.follow_up_required) {
      continue;
    }

    items.push({
      id: visit.id,
      visit_id: visit.id,
      farmer_id: visit.farmer?.id,
      farmer_name: farmerNameFromVisit(visit),
      crop: cropLabelFromVisit(visit),
      problem: problemFromVisit(visit),
      follow_up_date: dueRaw ?? null,
      days_overdue: Math.max(0, daysOverdue),
      due_today: dueToday
    });
  }

  return items.sort((a, b) => b.days_overdue - a.days_overdue);
}

function buildDashboardFromVisits(visits: Visit[]): DashboardData {
  const today = new Date();
  const todayVisits = visits.filter((v) => isSameVisitLocalDay(v, today));
  const farmersCovered = new Set(todayVisits.map((v) => v.farmer?.id ?? v.farmer_name ?? v.id)).size;
  const followUps = buildFollowUpsFromVisits(visits);
  const recent = [...visits]
    .sort((a, b) => {
      const ta = visitDisplayIso(a) ? new Date(visitDisplayIso(a)!).getTime() : 0;
      const tb = visitDisplayIso(b) ? new Date(visitDisplayIso(b)!).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 3)
    .map((v) => ({
      id: v.id,
      farmer_name: farmerNameFromVisit(v),
      crop: cropLabelFromVisit(v),
      visited_at: visitDisplayIso(v)
    }));

  return {
    visits_today: todayVisits.length,
    farmers_covered: farmersCovered,
    follow_ups_due: followUps.length,
    follow_ups: followUps,
    recent_visits: recent
  };
}

function normalizeDashboardPayload(data: unknown): DashboardData | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const followRaw = Array.isArray(row.follow_ups) ? row.follow_ups : Array.isArray(row.followups) ? row.followups : [];
  const recentRaw = Array.isArray(row.recent_visits)
    ? row.recent_visits
    : Array.isArray(row.recent)
      ? row.recent
      : [];

  const followUps = followRaw
    .map((item) => (item && typeof item === "object" ? normalizeFollowUp(item as Record<string, unknown>) : null))
    .filter((item): item is DashboardFollowUp => item != null);

  const recent = recentRaw
    .map((item) => (item && typeof item === "object" ? normalizeRecent(item as Record<string, unknown>) : null))
    .filter((item): item is DashboardRecentVisit => item != null);

  return {
    visits_today: Number(row.visits_today ?? row.visitsToday ?? 0) || 0,
    farmers_covered: Number(row.farmers_covered ?? row.farmersCovered ?? 0) || 0,
    follow_ups_due: Number(row.follow_ups_due ?? row.followUpsDue ?? followUps.length) || followUps.length,
    follow_ups: followUps,
    recent_visits: recent
  };
}

export async function fetchDashboard(options?: { force?: boolean }): Promise<DashboardData> {
  const visitsPromise = getHomeVisits({ force: options?.force, pageSize: 80 }).catch(() => null);

  try {
    const data = await apiClient<unknown>("mobile/dashboard/", { source: "HomeDashboard" });
    const normalized = normalizeDashboardPayload(data);
    const visitsCache = await visitsPromise;
    const fromVisits = visitsCache ? buildDashboardFromVisits(visitsCache.visits) : null;

    if (normalized) {
      const merged = mergeDashboard(normalized, fromVisits);
      await writeDashboardCache(merged);
      return merged;
    }
  } catch {
    // fall through to visits-based dashboard
  }

  try {
    const visitsCache = await visitsPromise;
    if (visitsCache) {
      const built = buildDashboardFromVisits(visitsCache.visits);
      await writeDashboardCache(built);
      return built;
    }
  } catch {
    // fall through
  }

  const cached = await readDashboardCache();
  if (cached) return cached;
  throw new Error("Unable to load dashboard.");
}

export async function fetchWorkStatus(): Promise<MobileWorkStatus> {
  try {
    const data = await apiClient<Record<string, unknown>>("mobile/work/status/", { source: "HomeDashboard" });
    const startedAtSource = {
      started_at:
        typeof data.started_at === "string"
          ? data.started_at
          : typeof data.start_time === "string"
            ? data.start_time
            : null,
      start_time: typeof data.start_time === "string" ? data.start_time : null,
      date: typeof data.date === "string" ? data.date : null
    };
    return {
      is_active: Boolean(data.is_active ?? data.active),
      started_at: resolveWorkdayStartedAt(startedAtSource),
      distance_km: typeof data.distance_km === "number" ? data.distance_km : Number(data.distance_km) || 0,
      route_points:
        typeof data.route_points === "number"
          ? data.route_points
          : Number(data.route_points ?? data.points_today ?? data.gps_points ?? 0) || 0,
      workday_id: typeof data.workday_id === "number" ? data.workday_id : undefined
    };
  } catch {
    const result = await fetchCurrentWorkday();
    if (result.kind === "active") {
      const w = result.workday;
      return {
        is_active: true,
        started_at: resolveWorkdayStartedAt(w),
        distance_km: 0,
        workday_id: w.workday_id ?? w.id
      };
    }
    return { is_active: false };
  }
}

export async function fetchUnreadNotificationCount(fallback = 0): Promise<number> {
  try {
    const data = await apiClient<{ count?: number; unread_count?: number } | number>("notifications/unread-count/", {
      source: "HomeDashboard"
    });
    if (typeof data === "number") return Math.max(0, data);
    const count = data.count ?? data.unread_count ?? 0;
    return Math.max(0, count);
  } catch {
    return fallback;
  }
}

export async function postStartWorkday(coords: { latitude: number; longitude: number; accuracy?: number | null }) {
  return apiClient("mobile/work/start/", {
    method: "POST",
    body: JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? undefined
    }),
    source: "HomeDashboard"
  });
}
