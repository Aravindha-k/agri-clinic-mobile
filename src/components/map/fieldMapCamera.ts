import type { MapRegion } from "../../types/map";
import type { MapCoordinate } from "./FieldMapView.types";

export type FieldMapEdgePadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type FieldMapCameraRef = {
  fitToCoordinates: (
    coords: MapCoordinate[],
    options?: { edgePadding?: FieldMapEdgePadding; animated?: boolean }
  ) => void;
  animateToRegion: (region: MapRegion, duration?: number) => void;
};

export function latitudeDeltaToZoom(latitudeDelta: number): number {
  const delta = Math.max(Number(latitudeDelta) || 0.05, 0.002);
  return Math.max(4, Math.min(18, Math.log2(360 / delta) - 0.5));
}

export function regionToViewState(region: MapRegion): {
  center: [number, number];
  zoom: number;
} {
  return {
    center: [region.longitude, region.latitude],
    zoom: latitudeDeltaToZoom(region.latitudeDelta)
  };
}

/** MapLibre fitBounds expects [west, south, east, north]. */
export function coordinatesToBounds(coords: MapCoordinate[]): [number, number, number, number] | null {
  if (!coords.length) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const point of coords) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null;

  if (minLat === maxLat) {
    minLat -= 0.001;
    maxLat += 0.001;
  }
  if (minLng === maxLng) {
    minLng -= 0.001;
    maxLng += 0.001;
  }

  return [minLng, minLat, maxLng, maxLat];
}

export function pointFromMetersOffset(
  center: MapCoordinate,
  northMeters: number,
  eastMeters: number
): [number, number] {
  const lat = center.latitude + northMeters / 111_320;
  const lng =
    center.longitude + eastMeters / (111_320 * Math.cos((center.latitude * Math.PI) / 180));
  return [lng, lat];
}

export function circlePolygonGeoJson(center: MapCoordinate, radiusMeters: number, segments = 48) {
  const ring: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    const north = radiusMeters * Math.cos(theta);
    const east = radiusMeters * Math.sin(theta);
    ring.push(pointFromMetersOffset(center, north, east));
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [ring]
    }
  };
}
