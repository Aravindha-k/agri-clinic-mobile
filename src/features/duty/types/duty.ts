import type { Employee } from "../../../api/employees";
import type { WorkdayStatus } from "../../../api/tracking";
import type { MapCoordinate, MapPin } from "../../../components/map/FieldMapView.types";

export type DutyHydrationStatus = "idle" | "loading" | "ready" | "error";
export type DutySyncStatus = "idle" | "syncing" | "confirmed" | "offline" | "error";

export type DutySessionStatus = "not_started" | "active" | "completed" | "auto_completed";

export type DutyMapVisitMarker = MapPin & {
  visitId?: number | string;
  pending?: boolean;
  sequence?: number;
};

export type DutyMapSummary = {
  dutyId?: number;
  workdayId?: number;
  status?: DutySessionStatus;
  startMarker?: MapCoordinate | null;
  endMarker?: MapCoordinate | null;
  routePoints: MapCoordinate[];
  visitMarkers: DutyMapVisitMarker[];
  currentLiveLocation?: MapCoordinate | null;
  bounds: MapCoordinate[];
  totalVisits?: number;
  completedVisits?: number;
  pendingSync?: number;
  noCoordinateVisits?: number;
  distanceKm?: number;
  raw?: unknown;
};

export type MobileBootstrap = {
  user: Employee | null;
  deviceSession: unknown | null;
  currentDuty: WorkdayStatus | null;
  dutyMap: DutyMapSummary | null;
  serverNow: string | null;
  serverTimeOffsetMs: number;
  featureFlags: Record<string, unknown>;
  raw?: unknown;
};

export type DutyStateSnapshot = {
  hydrationStatus: DutyHydrationStatus;
  currentDuty: WorkdayStatus | null;
  dutyMap: DutyMapSummary | null;
  serverTimeOffsetMs: number;
  isOffline: boolean;
  lastSyncedAt: string | null;
  syncStatus: DutySyncStatus;
  bootstrapError: string | null;
};
