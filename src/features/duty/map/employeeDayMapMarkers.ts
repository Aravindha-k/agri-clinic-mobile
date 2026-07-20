/**
 * Employee Day map — Start / submitted visits / End only.
 * Never includes route breadcrumbs, heartbeat pins, or draft visits.
 */
import type { MapCoordinate, MapPin } from "../../../components/map/FieldMapView.types";
import type { DutyMapSummary, DutyMapVisitMarker } from "../types/duty";

export type EmployeeDayMapMarkersInput = {
  dutyMap: DutyMapSummary | null | undefined;
  /** When true, End marker is allowed (backend-confirmed ended workday). */
  workdayEnded: boolean;
  labels?: {
    startTitle?: string;
    startDescription?: string;
    visitTitle?: string;
    endTitle?: string;
    endDescription?: string;
  };
};

function isSubmittedVisit(marker: DutyMapVisitMarker): boolean {
  return marker.pending !== true;
}

/**
 * Canonical employee markers for a single duty session / business day.
 * Dedupes visits by visitId / local_sync_id-style ids.
 */
export function buildEmployeeDayMapMarkers(input: EmployeeDayMapMarkersInput): MapPin[] {
  const { dutyMap, workdayEnded, labels } = input;
  if (!dutyMap) return [];

  const rows: MapPin[] = [];
  const seenVisitKeys = new Set<string>();

  if (dutyMap.startMarker) {
    rows.push({
      id: "route-start",
      lat: dutyMap.startMarker.latitude,
      lng: dutyMap.startMarker.longitude,
      title: labels?.startTitle ?? "Start",
      description: labels?.startDescription,
      kind: "route_start"
    });
  }

  for (const marker of dutyMap.visitMarkers ?? []) {
    if (!isSubmittedVisit(marker)) continue;
    const visitKey =
      marker.visitId != null
        ? `visit-${String(marker.visitId)}`
        : String(marker.id);
    if (seenVisitKeys.has(visitKey) || seenVisitKeys.has(String(marker.id))) {
      continue;
    }
    seenVisitKeys.add(visitKey);
    seenVisitKeys.add(String(marker.id));
    if (marker.visitId != null) {
      seenVisitKeys.add(String(marker.visitId));
    }
    rows.push({
      ...marker,
      id: marker.visitId != null ? `visit-${marker.visitId}` : marker.id,
      kind: "visit",
      pending: false,
      label: marker.sequence,
      title: marker.title || labels?.visitTitle || "Visit",
      description: marker.description
    });
  }

  if (workdayEnded && dutyMap.endMarker) {
    rows.push({
      id: "route-end",
      lat: dutyMap.endMarker.latitude,
      lng: dutyMap.endMarker.longitude,
      title: labels?.endTitle ?? "End",
      description: labels?.endDescription,
      kind: "route_end"
    });
  }

  return rows;
}

/** Camera fit set — Start + submitted visits + End only (never live / trail). */
export function buildEmployeeDayFitCoordinates(markers: MapPin[]): MapCoordinate[] {
  return markers.map((m) => ({ latitude: m.lat, longitude: m.lng }));
}

/** Strip trail points from employee presentation copies (backend raw kept separately). */
export function toEmployeeDutyMapPresentation(dutyMap: DutyMapSummary | null): DutyMapSummary | null {
  if (!dutyMap) return null;
  return {
    ...dutyMap,
    routePoints: [],
    visitMarkers: (dutyMap.visitMarkers ?? []).filter(isSubmittedVisit),
    currentLiveLocation: null
  };
}

export function dayMapCacheIdentity(input: {
  userId: number;
  businessDate: string;
  dutySessionId: number | string;
}): string {
  return `day-map:${input.userId}:${input.businessDate}:${input.dutySessionId}`;
}
