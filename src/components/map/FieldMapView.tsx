import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type MapViewType from "react-native-maps";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Polyline, Region } from "react-native-maps";
import { useTheme } from "../../theme";
import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";
import { logMapDiagnostics } from "../../utils/mapDebug";
import { safeMarkerPinColor } from "../../utils/mapMarker";
import { sanitizeRegion } from "../../utils/mapRegion";
import { MapErrorBoundary } from "./MapErrorBoundary";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  pinColor?: string;
};

export type MapCoordinate = { latitude: number; longitude: number };

type Props = {
  screenName?: string;
  height: number;
  width: number;
  region: Region;
  markers?: MapPin[];
  route?: MapCoordinate[];
  fitCoordinates?: MapCoordinate[];
  fitEdgePadding?: { top: number; right: number; bottom: number; left: number };
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  loading?: boolean;
  permissionResolved?: boolean;
  locationDenied?: boolean;
  /** Required when showsUserLocation is true. */
  locationGranted?: boolean;
  emptyMessage?: string;
  accuracyCircle?: { center: MapCoordinate; radiusMeters: number };
  mapRef?: RefObject<MapViewType | null>;
};

const MIN_MAP_HEIGHT = 220;
const MAP_FALLBACK_MESSAGE = "Map could not load. Please enable GPS and try again.";

export function FieldMapView({
  screenName = "FieldMapView",
  height,
  width,
  region,
  markers = [],
  route = [],
  fitCoordinates,
  fitEdgePadding = { top: 80, right: 60, bottom: 140, left: 60 },
  showsUserLocation = false,
  followsUserLocation = false,
  loading = false,
  permissionResolved = true,
  locationDenied = false,
  locationGranted = false,
  emptyMessage,
  accuracyCircle,
  mapRef: externalRef
}: Props) {
  const { theme } = useTheme();
  const internalRef = useRef<MapView>(null);
  const mapRef = externalRef ?? internalRef;
  const [mapReady, setMapReady] = useState(false);
  const mountedRef = useRef(true);
  const cameraAppliedRef = useRef(false);

  const safeRegion = useMemo(() => sanitizeRegion(region), [region]);

  const safeMarkers = useMemo(
    () =>
      markers
        .map((m) => {
          const lat = parseMapCoord(m.lat);
          const lng = parseMapCoord(m.lng);
          if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
          return { ...m, lat, lng };
        })
        .filter(Boolean) as MapPin[],
    [markers]
  );

  const safeRoute = useMemo(
    () =>
      route
        .map((p) => {
          const lat = parseMapCoord(p.latitude);
          const lng = parseMapCoord(p.longitude);
          if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
          return { latitude: lat, longitude: lng };
        })
        .filter(Boolean) as MapCoordinate[],
    [route]
  );

  const safeFit = useMemo(
    () =>
      fitCoordinates
        ?.map((p) => {
          const lat = parseMapCoord(p.latitude);
          const lng = parseMapCoord(p.longitude);
          if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
          return { latitude: lat, longitude: lng };
        })
        .filter(Boolean) as MapCoordinate[],
    [fitCoordinates]
  );

  const hasRenderableCoordinates = useMemo(() => {
    if (!hasValidMapCoords(safeRegion.latitude, safeRegion.longitude)) return false;
    if (safeMarkers.length > 0) return true;
    if (safeRoute.length >= 2) return true;
    if (safeFit && safeFit.length > 0) return true;
    if (showsUserLocation && locationGranted) return true;
    return false;
  }, [locationGranted, safeFit, safeMarkers.length, safeRegion.latitude, safeRegion.longitude, safeRoute.length, showsUserLocation]);

  const canRenderMap = useMemo(() => {
    if (!permissionResolved || loading) return false;
    if (locationDenied) return false;
    if (!hasValidMapCoords(safeRegion.latitude, safeRegion.longitude)) return false;
    if (!hasRenderableCoordinates) return false;
    if (showsUserLocation && !locationGranted) return false;
    return true;
  }, [
    hasRenderableCoordinates,
    loading,
    locationDenied,
    locationGranted,
    permissionResolved,
    safeRegion.latitude,
    safeRegion.longitude,
    showsUserLocation
  ]);

  const allowFollowUser =
    canRenderMap &&
    mapReady &&
    followsUserLocation &&
    showsUserLocation &&
    locationGranted &&
    Platform.OS === "ios";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setMapReady(false);
    cameraAppliedRef.current = false;
  }, [permissionResolved, locationDenied, locationGranted, safeRegion.latitude, safeRegion.longitude]);

  useEffect(() => {
    logMapDiagnostics(screenName, {
      permissionResolved,
      locationDenied,
      locationGranted,
      rawLatitude: region.latitude,
      rawLongitude: region.longitude,
      sanitizedLatitude: safeRegion.latitude,
      sanitizedLongitude: safeRegion.longitude,
      region: safeRegion,
      mapReady,
      canRenderMap,
      markerCount: safeMarkers.length,
      routePointCount: safeRoute.length,
      showsUserLocation,
      followsUserLocation: allowFollowUser
    });
  }, [
    allowFollowUser,
    canRenderMap,
    locationDenied,
    locationGranted,
    mapReady,
    permissionResolved,
    region.latitude,
    region.longitude,
    safeMarkers.length,
    safeRegion,
    safeRoute.length,
    screenName,
    showsUserLocation
  ]);

  const applyCamera = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !canRenderMap || !mountedRef.current || cameraAppliedRef.current) {
      return;
    }

    try {
      if (safeFit && safeFit.length >= 2) {
        map.fitToCoordinates(safeFit, {
          edgePadding: fitEdgePadding,
          animated: true
        });
        cameraAppliedRef.current = true;
        return;
      }

      if (safeFit?.length === 1) {
        const point = safeFit[0];
        map.animateToRegion(
          sanitizeRegion({
            latitude: point.latitude,
            longitude: point.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
          }),
          400
        );
        cameraAppliedRef.current = true;
      }
    } catch (err) {
      console.warn(`[Map:${screenName}] camera error`, err instanceof Error ? err.message : err);
    }
  }, [canRenderMap, fitEdgePadding, mapReady, mapRef, safeFit, screenName]);

  useEffect(() => {
    if (!mapReady || !canRenderMap) return;
    const timer = setTimeout(() => applyCamera(), 350);
    return () => clearTimeout(timer);
  }, [applyCamera, canRenderMap, mapReady]);

  const mapHeight = Math.max(height, MIN_MAP_HEIGHT);
  const shellWidth = Math.max(width, 1);

  const placeholderMessage =
    emptyMessage ??
    (locationDenied
      ? "Location not available. Please enable GPS and try again."
      : loading || !permissionResolved
        ? "Loading map…"
        : MAP_FALLBACK_MESSAGE);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.shell, { height: mapHeight, width: shellWidth, backgroundColor: theme.colors.cardMuted }]}>
        <Text style={styles.placeholderText}>Map available on Android/iOS app</Text>
      </View>
    );
  }

  return (
    <MapErrorBoundary height={mapHeight} screenName={screenName} fallbackMessage={placeholderMessage}>
      <View style={[styles.shell, { height: mapHeight, width: shellWidth, minHeight: MIN_MAP_HEIGHT }]}>
        {!canRenderMap ? (
          <View style={styles.placeholder}>
            {loading || !permissionResolved ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <Text style={styles.placeholderText}>{placeholderMessage}</Text>
            )}
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={safeRegion}
            onMapReady={() => {
              if (mountedRef.current) {
                setMapReady(true);
              }
            }}
            showsUserLocation={showsUserLocation && locationGranted && !locationDenied}
            showsMyLocationButton={Platform.OS === "android" && showsUserLocation && locationGranted}
            followsUserLocation={allowFollowUser}
            showsCompass
            loadingEnabled
            mapType="standard"
            userInterfaceStyle="light"
            pitchEnabled={false}
            rotateEnabled={false}
            toolbarEnabled={false}
            moveOnMarkerPress={false}
          >
            {accuracyCircle &&
            hasValidMapCoords(accuracyCircle.center.latitude, accuracyCircle.center.longitude) ? (
              <Circle
                center={accuracyCircle.center}
                radius={Math.min(Math.max(accuracyCircle.radiusMeters, 12), 200)}
                strokeColor={theme.colors.primary}
                fillColor={theme.colors.primarySoft}
                strokeWidth={2}
              />
            ) : null}
            {safeRoute.length >= 2 ? (
              <Polyline
                coordinates={safeRoute}
                strokeColor={theme.colors.primaryDark}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                geodesic
                zIndex={1}
              />
            ) : null}
            {safeMarkers.map((m) => (
              <Marker
                key={m.id}
                coordinate={{ latitude: m.lat, longitude: m.lng }}
                title={m.title}
                description={m.description}
                pinColor={safeMarkerPinColor(m.pinColor)}
                zIndex={2}
              />
            ))}
          </MapView>
        )}
      </View>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: "center",
    backgroundColor: "#e8f0ea",
    borderRadius: 18,
    overflow: "hidden"
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    minHeight: MIN_MAP_HEIGHT
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    minHeight: MIN_MAP_HEIGHT,
    padding: 20
  },
  placeholderText: {
    color: "#6B7F74",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  }
});
