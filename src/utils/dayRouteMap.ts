import type { LocationLogPoint } from "../api/tracking";
import type { MapCoordinate, MapPin } from "../components/map/FieldMapView.types";
import type { GpsBufferPoint } from "../../mobile/lib/gps/trackingService";
import { hasValidMapCoords, parseMapCoord } from "./mapCoords";
import { simplifyRouteForMap } from "./routeSimplify";
import { buildVisitMapMarkers, type VisitMapPoint } from "./visitMapFlow";

function pointTimeMs(point: { recorded_at?: string; captured_at?: string }) {
  const raw = point.recorded_at || point.captured_at;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function sameCoord(a: MapCoordinate, b: MapCoordinate) {
  return (
    Math.abs(a.latitude - b.latitude) < 0.00002 &&
    Math.abs(a.longitude - b.longitude) < 0.00002
  );
}

function toCoord(lat: string | number | null | undefined, lng: string | number | null | undefined): MapCoordinate | null {
  const latitude = parseMapCoord(lat);
  const longitude = parseMapCoord(lng);
  if (latitude == null || longitude == null || !hasValidMapCoords(latitude, longitude)) {
    return null;
  }
  return { latitude, longitude };
}

function dedupeConsecutive(points: MapCoordinate[]): MapCoordinate[] {
  const out: MapCoordinate[] = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (prev && sameCoord(prev, point)) continue;
    out.push(point);
  }
  return out;
}

function belongsToWorkday(
  point: { workday_id?: number; duty_session_id?: number },
  workdayId: number
) {
  if (point.workday_id && point.workday_id === workdayId) return true;
  if (point.duty_session_id && point.duty_session_id === workdayId) return true;
  return !point.workday_id && !point.duty_session_id;
}

/** Merge synced server points + local pending buffer into one chronological track. */
export function buildWorkdayGpsRoute(input: {
  serverPoints: LocationLogPoint[];
  pendingPoints?: GpsBufferPoint[];
  workdayId: number;
  live?: MapCoordinate | null;
  maxPoints?: number;
}): MapCoordinate[] {
  const timed: { at: number; coord: MapCoordinate }[] = [];

  for (const point of input.serverPoints) {
    const coord = toCoord(point.latitude, point.longitude);
    if (!coord) continue;
    timed.push({ at: pointTimeMs(point), coord });
  }

  for (const point of input.pendingPoints ?? []) {
    if (!belongsToWorkday(point, input.workdayId)) continue;
    const coord = toCoord(point.latitude, point.longitude);
    if (!coord) continue;
    timed.push({ at: pointTimeMs(point), coord });
  }

  timed.sort((a, b) => a.at - b.at);

  let route = dedupeConsecutive(timed.map((row) => row.coord));

  if (input.live) {
    const last = route[route.length - 1];
    if (!last || !sameCoord(last, input.live)) {
      route = [...route, input.live];
    }
  }

  return simplifyRouteForMap(route, input.maxPoints ?? 120);
}

function visitTimeMs(visitedAt?: string | null) {
  if (!visitedAt) return 0;
  const t = Date.parse(visitedAt);
  return Number.isNaN(t) ? 0 : t;
}

/** Clean day journey: work start → visits → live — no GPS breadcrumb zig-zags. */
export function buildDayJourneyRoute(input: {
  startPoint?: MapCoordinate | null;
  visits: VisitMapPoint[];
  live?: MapCoordinate | null;
}): MapCoordinate[] {
  const points: MapCoordinate[] = [];

  if (input.startPoint) {
    points.push(input.startPoint);
  }

  const sorted = [...input.visits].sort((a, b) => visitTimeMs(a.visitedAt) - visitTimeMs(b.visitedAt));
  for (const visit of sorted) {
    const coord = { latitude: visit.latitude, longitude: visit.longitude };
    const last = points[points.length - 1];
    if (!last || !sameCoord(last, coord)) {
      points.push(coord);
    }
  }

  if (input.live) {
    const last = points[points.length - 1];
    if (!last || !sameCoord(last, input.live)) {
      points.push(input.live);
    }
  }

  return points;
}

export function extractWorkdayStartPoint(input: {
  serverPoints: LocationLogPoint[];
  pendingPoints?: GpsBufferPoint[];
  workdayId: number;
}): MapCoordinate | null {
  const track = buildWorkdayGpsRoute({
    ...input,
    live: null,
    maxPoints: 1
  });
  return track[0] ?? null;
}

export function buildDayRouteMarkers(input: {
  startPoint?: MapCoordinate | null;
  visits: VisitMapPoint[];
  isActive?: boolean;
  live?: MapCoordinate | null;
  startLabel?: string;
  startDescription?: string;
}): MapPin[] {
  const markers: MapPin[] = [];

  if (input.startPoint) {
    const hideStart =
      input.isActive && input.live && sameCoord(input.startPoint, input.live);
    if (!hideStart) {
      markers.push({
        id: "route-start",
        lat: input.startPoint.latitude,
        lng: input.startPoint.longitude,
        title: input.startLabel,
        description: input.startDescription,
        kind: "route_start"
      });
    }
  }

  markers.push(...buildVisitMapMarkers(input.visits));

  return markers;
}

/** All marker coordinates for map camera fit — no polyline. */
export function buildDayMarkerFitCoords(input: {
  startPoint?: MapCoordinate | null;
  visits: VisitMapPoint[];
  live?: MapCoordinate | null;
}): MapCoordinate[] {
  return buildDayJourneyRoute(input);
}
