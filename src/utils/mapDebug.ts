import type { MapRegion } from "../types/map";

type MapDiagnosticPayload = {
  permissionResolved?: boolean;
  locationDenied?: boolean;
  locationGranted?: boolean;
  rawLatitude?: string | number | null;
  rawLongitude?: string | number | null;
  sanitizedLatitude?: number | null;
  sanitizedLongitude?: number | null;
  region?: MapRegion | null;
  mapReady?: boolean;
  canRenderMap?: boolean;
  markerCount?: number;
  routePointCount?: number;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  note?: string;
};

/** Production-safe map diagnostics (console.warn only). */
export function logMapDiagnostics(screen: string, payload: MapDiagnosticPayload) {
  console.warn(`[Map:${screen}]`, {
    ...payload,
    region: payload.region
      ? {
          latitude: payload.region.latitude,
          longitude: payload.region.longitude,
          latitudeDelta: payload.region.latitudeDelta,
          longitudeDelta: payload.region.longitudeDelta
        }
      : null
  });
}
