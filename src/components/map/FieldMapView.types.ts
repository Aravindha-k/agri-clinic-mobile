import type { RefObject } from "react";
import type { MapRegion } from "../../types/map";

export type MapPinKind =
  | "current"
  | "route_start"
  | "route_end"
  | "visit"
  | "farmer"
  | "checkin";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  /** Custom marker style — prefer `kind` for consistent icons. */
  kind?: MapPinKind;
  /** @deprecated Android only accepts named pin colors; use `kind` instead. */
  pinColor?: string;
};

export type MapCoordinate = { latitude: number; longitude: number };

export type FieldMapViewProps = {
  screenName?: string;
  height: number;
  width: number;
  region: MapRegion;
  markers?: MapPin[];
  route?: MapCoordinate[];
  fitCoordinates?: MapCoordinate[];
  fitEdgePadding?: { top: number; right: number; bottom: number; left: number };
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  loading?: boolean;
  permissionResolved?: boolean;
  locationDenied?: boolean;
  locationGranted?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  accuracyCircle?: {
    center: MapCoordinate;
    radiusMeters: number;
    /** Softer outer ring radius — defaults to radiusMeters when omitted. */
    outerRadiusMeters?: number;
  };
  mapRef?: RefObject<unknown | null>;
  routeStrokePrimary?: string;
  routeStrokeOutline?: string;
  /** Thinner stroke for small preview maps. */
  routeStyle?: "default" | "compact";
  /** Small dot markers for mini map previews. */
  compactMarkers?: boolean;
  /** When false, map is display-only (safe inside ScrollView). */
  interactive?: boolean;
  /** Smoothly center map on this coordinate while tracking (WhatsApp-style follow). */
  liveFocus?: MapCoordinate | null;
  liveFocusDelta?: number;
};
