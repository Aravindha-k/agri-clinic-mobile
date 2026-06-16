import type { RefObject } from "react";
import type { MapRegion } from "../../types/map";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
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
  accuracyCircle?: { center: MapCoordinate; radiusMeters: number };
  mapRef?: RefObject<unknown | null>;
};
