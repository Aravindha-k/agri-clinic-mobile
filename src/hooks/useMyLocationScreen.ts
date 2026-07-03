import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import type MapView from "react-native-maps";
import { Visit } from "../api/visits";
import type { MapCoordinate } from "../components/map/FieldMapView.types";
import { useConnectivityOnline } from "./useConnectivityOnline";
import { useGpsCompliance } from "../storage/GpsComplianceContext";
import { isGpsAvailable } from "../utils/gpsStatus";
import { useTracking } from "../storage/TrackingContext";
import { isBackgroundLocationTrackingActive } from "../tracking/backgroundLocationService";
import { readCachedActiveWorkday } from "../storage/workdaySessionStorage";
import { getForegroundLocation } from "../utils/location";
import { hasValidMapCoords, parseMapCoord } from "../utils/mapCoords";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../utils/mapRegion";
import { isSameVisitLocalDay, visitDisplayIso } from "../utils/format";
import { getHomeVisits } from "../utils/visitsCache";
import { useSyncStore } from "../../mobile/lib/store/syncStore";
import { formatDistanceKm } from "../../mobile/lib/format";

export type MyLocationVisitRow = {
  id: number;
  farmerName: string;
  village: string;
  visitedAt: string | null;
  statusLabel: string;
  latitude: number;
  longitude: number;
};

export type MyLocationStatusTone = "green" | "amber" | "red";

import { getWorkdayLocationsPage } from "../api/tracking";
import { useI18n } from "../i18n/I18nContext";
import { readPendingGpsBuffer } from "../../mobile/lib/gps/trackingService";
import { extractWorkdayStartPoint, buildDayMarkerFitCoords, buildDayRouteMarkers } from "../utils/dayRouteMap";
import { visitRowFromApi } from "../utils/visitMapFlow";

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

  const mapRef = useRef<MapView | null>(null);
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
        visits: visitsToday,
        live: liveCoordinate
      }),
    [liveCoordinate, startPoint, visitsToday]
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
        Location.hasServicesEnabledAsync(),
        Location.getForegroundPermissionsAsync()
      ]);
      if (!mountedRef.current) return;
      setLocationGranted(servicesEnabled && permission.status === "granted");
    } catch {
      if (mountedRef.current) setLocationGranted(false);
    }
  }, []);

  const loadLiveFix = useCallback(async () => {
    await refreshPermissionState();
    if (currentLocation?.accuracy != null && Number.isFinite(Number(currentLocation.accuracy))) {
      setLiveAccuracy(Number(currentLocation.accuracy));
      return;
    }
    try {
      const result = await getForegroundLocation();
      if (!mountedRef.current) return;
      if (result.granted) {
        setLocationGranted(true);
        setLiveAccuracy(result.location.coords.accuracy ?? null);
      }
    } catch {
      // Keep permission-based grant; tracking context may still have a fix.
    }
  }, [currentLocation?.accuracy, refreshPermissionState]);

  const loadVisits = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setServerRefreshing(true);
    }
    try {
      const workdayId = trackingWorkday?.workday_id;
      const [visitsCache, locationPage] = await Promise.all([
        getHomeVisits({ pageSize: 80 }).catch(() => null),
        workdayId
          ? getWorkdayLocationsPage(workdayId, 1, 120).catch(() => null)
          : Promise.resolve(null)
      ]);
      if (!mountedRef.current) return;

      const today = new Date();
      const visitRows =
        visitsCache?.visits
          .filter((v) => isSameVisitLocalDay(v, today))
          .map(visitToRow)
          .filter((row): row is MyLocationVisitRow => row != null) ?? [];
      setVisitsToday(visitRows);

      if (workdayId) {
        const serverPoints = locationPage?.results ?? [];
        setStartPoint(
          extractWorkdayStartPoint({
            serverPoints,
            pendingPoints: readPendingGpsBuffer(),
            workdayId
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
  }, [isActive, trackingWorkday?.workday_id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadLiveFix(),
        loadVisits({ silent: true }),
        refreshTracking().catch(() => undefined),
        isBackgroundLocationTrackingActive().then((active) => {
          if (mountedRef.current) setBackgroundTracking(active);
        })
      ]);
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [loadLiveFix, loadVisits, refreshTracking]);

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
        isActive: workdayActive,
        live: liveCoordinate,
        startLabel: t("myLocation.legendRouteStart"),
        startDescription: t("myLocation.workStartHint")
      }),
    [liveCoordinate, startPoint, t, visitsToday, workdayActive]
  );

  const mapRegion = useMemo(() => {
    if (mapFlowCoords.length === 0) return DEFAULT_MAP_REGION;
    return fitMapRegion(mapFlowCoords);
  }, [mapFlowCoords]);

  const fitCoordinates = useMemo(() => {
    if (mapFitPoints.length >= 2) return mapFitPoints;
    if (liveCoordinate) return [liveCoordinate];
    if (mapFitPoints.length === 1) return mapFitPoints;
    return undefined;
  }, [liveCoordinate, mapFitPoints]);

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
      void loadLiveFix();
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
  }, [currentLocation?.latitude, currentLocation?.longitude, loadLiveFix]);

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
