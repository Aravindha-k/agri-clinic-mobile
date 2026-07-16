import { useCallback, useMemo, useRef, useState } from "react";
import type MapViewType from "react-native-maps";
import type { MapCoordinate, MapPin } from "../components/map/FieldMapView.types";
import { useConnectivityOnline } from "./useConnectivityOnline";
import { useGpsCompliance } from "../storage/GpsComplianceContext";
import { useTracking } from "../storage/TrackingContext";
import { useDuty } from "../features/duty/store/DutyContext";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../utils/mapRegion";
import { formatDistanceKm } from "../../mobile/lib/format";

export type MyLocationVisitRow = {
  id: number | string;
  farmerName: string;
  village: string;
  visitedAt: string | null;
  statusLabel: string;
  latitude: number;
  longitude: number;
};

export type MyLocationStatusTone = "green" | "amber" | "red";

export function useMyLocationScreen() {
  const online = useConnectivityOnline();
  const { availability, permissionDenied, status: gpsComplianceStatus } = useGpsCompliance();
  const { currentLocation, pendingGpsCount, foregroundTrackingActive, backgroundTrackingActive, refreshTrackingState } =
    useTracking();
  const { currentDuty, dutyMap, refreshDutyMap } = useDuty();
  const mapRef = useRef<MapViewType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const startedAt = currentDuty?.start_time ?? currentDuty?.started_at ?? null;
  const isActive = Boolean(currentDuty?.is_active);
  const workdayFinished = Boolean(currentDuty && !currentDuty.is_active);

  const liveCoordinate = useMemo(() => {
    const lat = currentLocation?.latitude ? Number(currentLocation.latitude) : NaN;
    const lng = currentLocation?.longitude ? Number(currentLocation.longitude) : NaN;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const visitsToday = useMemo<MyLocationVisitRow[]>(
    () =>
      (dutyMap?.visitMarkers ?? []).map((marker) => ({
        id: marker.visitId ?? marker.id,
        farmerName: marker.title ?? "Farmer",
        village: marker.description ?? "—",
        visitedAt: null,
        statusLabel: marker.pending ? "Pending sync" : "Completed",
        latitude: marker.lat,
        longitude: marker.lng
      })),
    [dutyMap?.visitMarkers]
  );

  const markers = useMemo<MapPin[]>(() => {
    return [
      dutyMap?.startMarker
        ? {
            id: "route-start",
            lat: dutyMap.startMarker.latitude,
            lng: dutyMap.startMarker.longitude,
            title: "Route start",
            kind: "route_start" as const
          }
        : null,
      ...(dutyMap?.visitMarkers ?? []),
      dutyMap?.endMarker
        ? {
            id: "route-end",
            lat: dutyMap.endMarker.latitude,
            lng: dutyMap.endMarker.longitude,
            title: "Route end",
            kind: "route_end" as const
          }
        : null
    ].filter((marker): marker is MapPin => marker != null);
  }, [dutyMap]);

  const fitCoordinates = useMemo<MapCoordinate[] | undefined>(() => {
    if (dutyMap?.bounds?.length) return dutyMap.bounds;
    if (liveCoordinate) return [liveCoordinate];
    return undefined;
  }, [dutyMap?.bounds, liveCoordinate]);

  const mapRegion = useMemo(() => {
    if (!fitCoordinates?.length) return DEFAULT_MAP_REGION;
    return fitMapRegion(fitCoordinates.map((p) => ({ lat: p.latitude, lng: p.longitude })));
  }, [fitCoordinates]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshTrackingState(), refreshDutyMap().catch(() => undefined)]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDutyMap, refreshTrackingState]);

  const centerOnVisit = useCallback((visit: MyLocationVisitRow) => {
    mapRef.current?.animateToRegion(
      {
        latitude: visit.latitude,
        longitude: visit.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      },
      350
    );
  }, []);

  const emptyStateKey = !online
    ? "offline"
    : !currentDuty
      ? "noWorkday"
      : permissionDenied || gpsComplianceStatus === "blocked" || availability === "services_off"
        ? "noGps"
        : null;

  return {
    mapRef,
    online,
    isActive,
    workdayFinished,
    startedAt,
    lastSyncTime: dutyMap ? new Date().toISOString() : null,
    distanceKm: formatDistanceKm(Number(dutyMap?.distanceKm) || 0),
    accuracyMeters: currentLocation?.accuracy ?? null,
    isSyncing: false,
    refreshing,
    markers,
    mapRegion,
    fitCoordinates,
    visitsToday,
    emptyStateKey,
    locationGranted: gpsComplianceStatus !== "blocked",
    liveCoordinate,
    accuracyCircle:
      liveCoordinate && currentLocation?.accuracy
        ? {
            center: liveCoordinate,
            radiusMeters: Math.max(12, Number(currentLocation.accuracy)),
            outerRadiusMeters: Math.max(24, Number(currentLocation.accuracy) * 1.8)
          }
        : undefined,
    backgroundTracking: backgroundTrackingActive,
    pendingVisits: visitsToday.filter((visit) => visit.statusLabel === "Pending sync").length,
    gpsPending: pendingGpsCount,
    statusTone: isActive ? "green" : "amber",
    trackingStatusKey: isActive ? "active" : "inactive",
    refresh,
    centerOnVisit
  };
}
