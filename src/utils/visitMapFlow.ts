import type { MapCoordinate, MapPin } from "../components/map/FieldMapView.types";
import { hasValidMapCoords, parseMapCoord } from "./mapCoords";

export type VisitMapPoint = {
  id: number;
  latitude: number;
  longitude: number;
  visitedAt?: string | null;
  farmerName?: string;
  village?: string;
};

function visitTimeMs(visitedAt?: string | null) {
  if (!visitedAt) return 0;
  const t = Date.parse(visitedAt);
  return Number.isNaN(t) ? 0 : t;
}

function sameCoord(a: MapCoordinate, b: MapCoordinate) {
  return (
    Math.abs(a.latitude - b.latitude) < 0.00002 &&
    Math.abs(a.longitude - b.longitude) < 0.00002
  );
}

/** Chronological visit points — optional live append for journey previews. */
export function buildVisitFlowRoute(
  visits: VisitMapPoint[],
  live?: MapCoordinate | null
): MapCoordinate[] {
  const sorted = [...visits].sort((a, b) => visitTimeMs(a.visitedAt) - visitTimeMs(b.visitedAt));
  const points: MapCoordinate[] = sorted.map((v) => ({
    latitude: v.latitude,
    longitude: v.longitude
  }));
  if (live) {
    const last = points[points.length - 1];
    if (!last || !sameCoord(last, live)) {
      points.push(live);
    }
  }
  return points;
}

/** Points for map camera fit — visits + live, no connecting line. */
export function buildMapFitPoints(
  visits: VisitMapPoint[],
  live?: MapCoordinate | null
): MapCoordinate[] {
  return buildVisitFlowRoute(visits, live);
}

export function buildVisitMapMarkers(visits: VisitMapPoint[]): MapPin[] {
  return visits.map((visit) => ({
    id: `visit-${visit.id}`,
    lat: visit.latitude,
    lng: visit.longitude,
    title: visit.farmerName,
    description: visit.village,
    kind: "visit"
  }));
}

export function visitRowFromApi(visit: {
  id: number;
  latitude?: string | number | null;
  longitude?: string | number | null;
  farmer_name?: string | null;
  farmer?: { name?: string };
  village_name?: string | null;
  farmer_village?: string | null;
  visit_date?: string | null;
  created_at?: string | null;
}): VisitMapPoint | null {
  const lat = parseMapCoord(visit.latitude);
  const lng = parseMapCoord(visit.longitude);
  if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
  return {
    id: visit.id,
    latitude: lat,
    longitude: lng,
    visitedAt: visit.visit_date || visit.created_at || null,
    farmerName: visit.farmer_name || visit.farmer?.name || "Farmer",
    village: visit.village_name?.trim() || visit.farmer_village?.trim() || undefined
  };
}
