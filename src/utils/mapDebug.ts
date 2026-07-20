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

function mapDiagnosticsEnabled(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__ === true;
}

/** Dev-only map diagnostics — never floods release builds. */
export function logMapDiagnostics(screen: string, payload: MapDiagnosticPayload) {
  if (!mapDiagnosticsEnabled()) return;
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
 * Dev-only map lifecycle logs. Never logs API keys or credentials.
 */
export function logMapEvent(screen: string, event: MapLogEvent, detail?: Record<string, unknown>) {
  if (!mapDiagnosticsEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(`[Map] ${event}`, { screen, ...(detail ?? {}) });
}
