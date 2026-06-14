export type DashboardFollowUp = {
  id: number | string;
  farmer_id?: number;
  farmer_name: string;
  crop?: string;
  problem?: string;
  follow_up_date?: string | null;
  days_overdue: number;
  due_today: boolean;
  visit_id?: number;
};

export type DashboardRecentVisit = {
  id: number;
  farmer_name: string;
  crop?: string;
  visited_at?: string | null;
};

export type DashboardData = {
  visits_today: number;
  farmers_covered: number;
  follow_ups_due: number;
  follow_ups: DashboardFollowUp[];
  recent_visits: DashboardRecentVisit[];
};

export type MobileWorkStatus = {
  is_active: boolean;
  started_at?: string | null;
  distance_km?: number;
  route_points?: number;
  workday_id?: number;
};
