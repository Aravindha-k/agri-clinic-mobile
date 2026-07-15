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
  shouldMountMap?: boolean;
  canRenderMap?: boolean;
  markerCount?: number;
  routePointCount?: number;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  mapType?: string;
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

export type MapLogEvent =
  | "component_mounted"
  | "api_key_configured"
  | "permission_status"
  | "gps_status"
  | "initial_region"
  | "location_success"
  | "location_error"
  | "markers_count"
  | "render_blocked"
  | "render_error";

/**
 * Structured, release-safe map lifecycle logs. Never logs the API key value —
 * only whether native Maps was configured at build time.
 */
export function logMapEvent(screen: string, event: MapLogEvent, detail?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[Map] ${event}`, { screen, ...(detail ?? {}) });
}
