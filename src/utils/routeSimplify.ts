import type { MapCoordinate } from "../components/map/FieldMapView.types";

/** Reduce polyline density for map display — keeps start/end and evenly samples middle. */
export function simplifyRouteForMap<T extends MapCoordinate>(points: T[], maxPoints = 120): T[] {
  if (points.length <= maxPoints) {
    return points;
  }
  const step = Math.ceil(points.length / maxPoints);
  const simplified: T[] = [];
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i]);
  }
  const last = points[points.length - 1];
  const tail = simplified[simplified.length - 1];
  if (tail.latitude !== last.latitude || tail.longitude !== last.longitude) {
    simplified.push(last);
  }
  return simplified;
}
