import { apiClient } from "../../../api/client";
import type { MapCoordinate, MapPin } from "../../../components/map/FieldMapView.types";
import { hasValidMapCoords, parseMapCoord } from "../../../utils/mapCoords";
import type { DutyMapSummary, DutyMapVisitMarker } from "../types/duty";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function scalar(value: unknown): string | number | null | undefined {
  return typeof value === "string" || typeof value === "number" || value == null ? value : undefined;
}

function coordFrom(value: unknown): MapCoordinate | null {
  const row = asRecord(value);
  if (!row) return null;
  const lat = parseMapCoord(scalar(row.latitude ?? row.lat));
  const lng = parseMapCoord(scalar(row.longitude ?? row.lng ?? row.lon));
  if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
  return { latitude: lat, longitude: lng };
}

function coordList(value: unknown): MapCoordinate[] {
  return asArray(value).map(coordFrom).filter((point): point is MapCoordinate => point != null);
}

function firstPresent(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null) return row[key];
  }
  return undefined;
}

function visitMarkerFrom(value: unknown, index: number): DutyMapVisitMarker | null {
  const row = asRecord(value);
  const coord = coordFrom(value);
  if (!row || !coord) return null;
  const visitId = row.visit_id ?? row.id ?? row.local_sync_id ?? `pending-${index + 1}`;
  const title =
    typeof row.title === "string"
      ? row.title
      : typeof row.farmer_name === "string"
        ? row.farmer_name
        : `Visit ${index + 1}`;
  const description =
    typeof row.description === "string"
      ? row.description
      : typeof row.village_name === "string"
        ? row.village_name
        : typeof row.village === "string"
          ? row.village
          : undefined;
  return {
    id: `visit-${String(visitId)}`,
    lat: coord.latitude,
    lng: coord.longitude,
    title,
    description,
    kind: "visit",
    visitId: visitId as number | string,
    pending: row.pending === true || row.sync_status === "pending",
    sequence: Number(row.sequence ?? row.order ?? index + 1) || index + 1
  } as DutyMapVisitMarker;
}

function markerToCoord(marker: MapPin): MapCoordinate {
  return { latitude: marker.lat, longitude: marker.lng };
}

export function normalizeDutyMapPayload(raw: unknown): DutyMapSummary {
  const row = asRecord(raw) ?? {};
  const startMarker = coordFrom(firstPresent(row, ["start_marker", "startMarker", "start", "started_at_location"]));
  const endMarker = coordFrom(firstPresent(row, ["end_marker", "endMarker", "end", "ended_at_location"]));
  const currentLiveLocation = coordFrom(
    firstPresent(row, ["current_live_location", "currentLiveLocation", "live_location", "last_location"])
  );
  const routePoints = coordList(firstPresent(row, ["route_points", "routePoints", "route", "points"]));
  const visitMarkers = asArray(firstPresent(row, ["visit_markers", "visitMarkers", "visits"]))
    .map(visitMarkerFrom)
    .filter((marker): marker is DutyMapVisitMarker => marker != null);
  const bounds = coordList(row.bounds);
  // Employee map framing — markers only. routePoints stay on the payload for admin/analytics.
  const fallbackBounds = [
    startMarker,
    ...visitMarkers.map(markerToCoord),
    endMarker
  ].filter((point): point is MapCoordinate => point != null);

  return {
    dutyId: Number(row.duty_id ?? row.duty_session_id ?? row.id) || undefined,
    workdayId: Number(row.workday_id) || undefined,
    status: typeof row.status === "string" ? (row.status as DutyMapSummary["status"]) : undefined,
    startMarker,
    endMarker,
    routePoints,
    visitMarkers,
    currentLiveLocation,
    bounds: bounds.length ? bounds : fallbackBounds,
    totalVisits: Number(row.total_visits ?? row.visit_count) || undefined,
    completedVisits: Number(row.completed_visits) || undefined,
    pendingSync: Number(row.pending_sync ?? row.pending_count) || undefined,
    noCoordinateVisits: Number(row.no_coordinate_visits ?? row.no_coordinate_count) || undefined,
    distanceKm: Number(row.distance_km ?? row.distanceKm) || undefined,
    raw
  };
}

export async function fetchCurrentDutyMap(): Promise<DutyMapSummary> {
  const raw = await apiClient<unknown>("tracking/duty/current/map/", {
    method: "GET",
    source: "DutyMap",
    dedupe: false
  });
  return normalizeDutyMapPayload(raw);
}

export async function fetchDutyMap(dutyId: number): Promise<DutyMapSummary> {
  const raw = await apiClient<unknown>(`tracking/duty/${dutyId}/map/`, {
    method: "GET",
    source: "DutyMap",
    dedupe: false
  });
  return normalizeDutyMapPayload(raw);
}
