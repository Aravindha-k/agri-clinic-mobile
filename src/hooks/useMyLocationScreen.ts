import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import type MapViewType from "react-native-maps";
import { Visit } from "../api/visits";
import type { MapCoordinate } from "../components/map/FieldMapView.types";
import { useConnectivityOnline } from "./useConnectivityOnline";
import { useGpsCompliance } from "../storage/GpsComplianceContext";
import { isGpsAvailable } from "../utils/gpsStatus";
import { useTracking } from "../storage/TrackingContext";
import { isBackgroundLocationTrackingActive } from "../tracking/backgroundLocationService";
import { readCachedActiveWorkday } from "../storage/workdaySessionStorage";
import { readLocationServicesEnabled } from "../utils/locationServicesProbe";
import { hasValidMapCoords, parseMapCoord } from "../utils/mapCoords";
import { logMapEvent } from "../utils/mapDebug";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../utils/mapRegion";
import { isSameVisitLocalDay, visitDisplayIso } from "../utils/format";
import { getHomeVisits } from "../utils/visitsCache";
import { useSyncStore } from "../../mobile/lib/store/syncStore";
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

import { useI18n } from "../i18n/I18nContext";
import { readPendingGpsBuffer } from "../../mobile/lib/gps/trackingService";
import { extractWorkdayStartPoint, buildDayMarkerFitCoords, buildDayRouteMarkers } from "../utils/dayRouteMap";
import { visitRowFromApi } from "../utils/visitMapFlow";
import { readPendingVisits } from "../../mobile/lib/pendingVisitsQueue";

function visitToRow(visit: Visit): MyLocationVisitRow | null {
  const mapped = visitRowFromApi({
    id: visit.id,
    latitude: visit.latitude,
    longitude: visit.longitude,
    farmer_name: visit.farmer_name,
    farmer: visit.farmer,
    village_name: visit.village_name,
    farmer_village: visit.farmer_village,
    visit_date: visit.visit_date,
    created_at: visitDisplayIso(visit)
  });
  if (!mapped) return null;
  return {
    id: mapped.id,
    farmerName: mapped.farmerName || "Farmer",
    village: mapped.village || "—",
    visitedAt: mapped.visitedAt ?? null,
    statusLabel: "Completed",
    latitude: mapped.latitude,
    longitude: mapped.longitude
  };
}

export function useMyLocationScreen() {
  const { t } = useI18n();
  const online = useConnectivityOnline();
  const { availability, permissionDenied, status: gpsComplianceStatus } = useGpsCompliance();
  const pendingVisits = useSyncStore((s) => s.pendingVisitsCount + s.failedVisitsCount);
  const pendingGps = useSyncStore((s) => s.pendingGPSCount);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  const {
    isActive,
    startedAt,
    lastSyncTime,
    currentLocation,
    refreshTracking,
    workdaySyncStatus,
    cachedDistanceKm,
    pendingSyncCount,
    workday: trackingWorkday
  } = useTracking();

  const mapRef = useRef<MapViewType | null>(null);
  const mountedRef = useRef(true);
  const [workdayActive, setWorkdayActive] = useState(isActive);
  const [workdayFinished, setWorkdayFinished] = useState(false);
  const [distanceKm, setDistanceKm] = useState(cachedDistanceKm);
  const [visitsToday, setVisitsToday] = useState<MyLocationVisitRow[]>([]);
  const [startPoint, setStartPoint] = useState<MapCoordinate | null>(null);
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [locationGranted, setLocationGranted] = useState(() => {
    const lat = parseMapCoord(currentLocation?.latitude);
    const lng = parseMapCoord(currentLocation?.longitude);
    return lat != null && lng != null && hasValidMapCoords(lat, lng);
  });
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverRefreshing, setServerRefreshing] = useState(false);

  const gpsPending = Math.max(pendingGps, pendingSyncCount);

  const liveCoordinate = useMemo(() => {
    const lat = parseMapCoord(currentLocation?.latitude);
    const lng = parseMapCoord(currentLocation?.longitude);
    if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
    return { latitude: lat, longitude: lng };
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const mapFitPoints = useMemo(
    () =>
      buildDayMarkerFitCoords({
        startPoint,
        visits: visitsToday
      }),
    [startPoint, visitsToday]
  );

  const mapFlowCoords = useMemo(() => {
    return mapFitPoints.map((p) => ({ lat: p.latitude, lng: p.longitude }));
  }, [mapFitPoints]);

  const accuracyMeters =
    liveAccuracy ??
    (currentLocation?.accuracy != null && Number.isFinite(Number(currentLocation.accuracy))
      ? Number(currentLocation.accuracy)
      : null);

  const hasLiveGps = useMemo(() => {
    if (locationGranted) return true;
    if (liveCoordinate) return true;
    if (accuracyMeters != null && accuracyMeters > 0) return true;
    return isGpsAvailable(availability);
  }, [accuracyMeters, availability, liveCoordinate, locationGranted]);

  const refreshPermissionState = useCallback(async () => {
    try {
      const [servicesEnabled, permission] = await Promise.all([
        readLocationServicesEnabled(),
        Location.getForegroundPermissionsAsync()
      ]);
      if (!mountedRef.current) return;
      const granted = servicesEnabled && permission.status === "granted";
      setLocationGranted(granted);
      logMapEvent("MyLocationScreen", "permission_status", {
        permission: permission.status,
        servicesEnabled,
        granted
      });
      logMapEvent("MyLocationScreen", "gps_status", { servicesEnabled });
      if (granted) {
        logMapEvent("MyLocationScreen", "location_success", { source: "foreground_permission" });
      }
    } catch (err) {
      if (mountedRef.current) setLocationGranted(false);
      logMapEvent("MyLocationScreen", "location_error", {
        message: err instanceof Error ? err.message : "permission_check_failed"
      });
    }
  }, []);

  const loadVisits = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setServerRefreshing(true);
    }
    try {
      const workdayId = trackingWorkday?.workday_id;
      const [visitsCache, pendingRows] = await Promise.all([
        getHomeVisits({ pageSize: 80 }).catch(() => null),
        readPendingVisits().catch(() => [])
      ]);
      if (!mountedRef.current) return;

      const today = new Date();
      const visitRows =
        visitsCache?.visits
          .filter((v) => isSameVisitLocalDay(v, today))
          .map(visitToRow)
          .filter((row): row is MyLocationVisitRow => row != null) ?? [];
      const queuedRows = pendingRows
        .filter((row) => isSameVisitLocalDay({ created_at: row.createdAt }, today))
        .map((row) => {
          const mapped = visitRowFromApi({
            id: row.local_sync_id,
            latitude: row.values.latitude,
            longitude: row.values.longitude,
            farmer_name: row.values.farmer_name,
            village_name: row.values.village,
            visit_date: row.values.visit_date,
            created_at: row.createdAt
          });
          return mapped
            ? {
                id: mapped.id,
                farmerName: mapped.farmerName || "Farmer",
                village: mapped.village || "—",
                visitedAt: mapped.visitedAt ?? null,
                statusLabel: "Pending sync",
                latitude: mapped.latitude,
                longitude: mapped.longitude
              }
            : null;
        })
        .filter((row): row is MyLocationVisitRow => row != null);
      setVisitsToday([...visitRows, ...queuedRows]);

      if (workdayId) {
        setStartPoint(
          extractWorkdayStartPoint({
            serverStart: trackingWorkday,
            pendingPoints: readPendingGpsBuffer(),
            workdayId,
            dutySessionId: trackingWorkday?.duty_session_id
          })
        );
      } else {
        setStartPoint(null);
      }

      setWorkdayActive(isActive);
      setWorkdayFinished(Boolean(workdayId) && !isActive);
    } finally {
      if (mountedRef.current) {
        setServerRefreshing(false);
      }
    }
  }, [isActive, trackingWorkday]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadVisits({ silent: true }),
        refreshTracking().catch(() => undefined),
        isBackgroundLocationTrackingActive().then((active) => {
          if (mountedRef.current) setBackgroundTracking(active);
        })
      ]);
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [loadVisits, refreshTracking]);

  useEffect(() => {
    mountedRef.current = true;
    void readCachedActiveWorkday().then((cached) => {
      if (!mountedRef.current || !cached) return;
      setDistanceKm(cached.last_known_distance);
    });
    void refreshPermissionState();
    void loadVisits();
    void isBackgroundLocationTrackingActive().then((active) => {
      if (mountedRef.current) setBackgroundTracking(active);
    });
    const liveTimer = setInterval(() => void refreshPermissionState(), 30_000);
    const visitsTimer = setInterval(() => void loadVisits({ silent: true }), 60_000);
    return () => {
      mountedRef.current = false;
      clearInterval(liveTimer);
      clearInterval(visitsTimer);
    };
  }, [loadVisits, refreshPermissionState]);

  useEffect(() => {
    setWorkdayActive(isActive);
    setDistanceKm(cachedDistanceKm);
    if (isGpsAvailable(availability) || liveCoordinate) {
      setLocationGranted(true);
    }
    if (currentLocation?.accuracy != null && Number.isFinite(Number(currentLocation.accuracy))) {
      setLiveAccuracy(Number(currentLocation.accuracy));
    }
  }, [availability, cachedDistanceKm, currentLocation?.accuracy, isActive, liveCoordinate]);

  const markers = useMemo(
    () =>
      buildDayRouteMarkers({
        startPoint,
        visits: visitsToday,
        startLabel: t("myLocation.legendRouteStart"),
        startDescription: t("myLocation.workStartHint")
      }),
    [startPoint, t, visitsToday]
  );

  const mapRegion = useMemo(() => {
    if (mapFlowCoords.length === 0) return DEFAULT_MAP_REGION;
    return fitMapRegion(mapFlowCoords);
  }, [mapFlowCoords]);

  const fitCoordinates = useMemo(() => {
    if (mapFitPoints.length >= 2) return mapFitPoints;
    if (mapFitPoints.length === 1) return mapFitPoints;
    return undefined;
  }, [mapFitPoints]);

  const gpsConfirmedOff =
    !hasLiveGps &&
    (permissionDenied ||
      gpsComplianceStatus === "blocked" ||
      availability === "services_off" ||
      availability === "permission_denied");

  const gpsDisabled = gpsConfirmedOff;

  const statusTone: MyLocationStatusTone = useMemo(() => {
    if (gpsDisabled) return "red";
    if (pendingVisits > 0 || gpsPending > 0 || workdaySyncStatus === "syncing" || workdaySyncStatus === "connecting") {
      return "amber";
    }
    if (workdayActive) return "green";
    return "amber";
  }, [gpsDisabled, gpsPending, pendingVisits, workdayActive, workdaySyncStatus]);

  const trackingStatusKey = useMemo(() => {
    if (!workdayActive) return "inactive" as const;
    if (!hasLiveGps && gpsDisabled) return "gpsOff" as const;
    if (statusTone === "amber") return "syncPending" as const;
    return "active" as const;
  }, [gpsDisabled, hasLiveGps, statusTone, workdayActive]);

  const emptyStateKey = useMemo(() => {
    if (!online) return "offline" as const;
    if (!workdayActive && !workdayFinished) return "noWorkday" as const;
    if (gpsConfirmedOff) return "noGps" as const;
    return null;
  }, [gpsConfirmedOff, online, workdayActive, workdayFinished]);

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

  const locateMe = useCallback(() => {
    const lat = parseMapCoord(currentLocation?.latitude);
    const lng = parseMapCoord(currentLocation?.longitude);
    if (lat == null || lng == null) {
      return;
    }
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      },
      350
    );
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const fitRoute = useCallback(() => {
    if (fitCoordinates && fitCoordinates.length >= 1) {
      mapRef.current?.fitToCoordinates(fitCoordinates, {
        edgePadding: { top: 160, right: 48, bottom: 220, left: 48 },
        animated: true
      });
      return;
    }
    locateMe();
  }, [fitCoordinates, locateMe]);

  const accuracyCircle = useMemo(() => {
    if (!liveCoordinate || accuracyMeters == null || accuracyMeters <= 0) return undefined;
    const inner = Math.min(Math.max(accuracyMeters, 12), 50);
    const outer = Math.min(Math.max(accuracyMeters * 1.8, 24), 90);
    return {
      center: liveCoordinate,
      radiusMeters: inner,
      outerRadiusMeters: outer
    };
  }, [accuracyMeters, liveCoordinate]);

  return {
    mapRef,
    online,
    isActive: workdayActive,
    workdayFinished,
    startedAt,
    lastSyncTime,
    distanceKm: formatDistanceKm(distanceKm),
    accuracyMeters,
    locationGranted: hasLiveGps,
    hasLiveGps,
    backgroundTracking,
    pendingVisits,
    gpsPending,
    isSyncing,
    serverRefreshing,
    refreshing,
    liveCoordinate,
    accuracyCircle,
    markers,
    mapRegion,
    routeLine: [],
    fitCoordinates,
    visitsToday,
    statusTone,
    trackingStatusKey,
    emptyStateKey,
    refresh,
    centerOnVisit,
    locateMe,
    fitRoute
  };
}
