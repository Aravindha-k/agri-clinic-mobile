import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type MapViewType from "react-native-maps";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Polyline } from "react-native-maps";
import { useTheme } from "../../theme";
import { FIELD_MAP_TYPE } from "../../types/mapType";
import type { MapRegion } from "../../types/map";
import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";
import { logMapDiagnostics } from "../../utils/mapDebug";
import { sanitizeRegion } from "../../utils/mapRegion";
import { FieldMapMarker } from "./FieldMapMarker";
import { MapErrorBoundary } from "./MapErrorBoundary";
import type { FieldMapViewProps, MapCoordinate, MapPin } from "./FieldMapView.types";

export type { MapCoordinate, MapPin, MapPinKind } from "./FieldMapView.types";

type Props = FieldMapViewProps & {
  mapRef?: RefObject<MapViewType | null>;
};

const MIN_MAP_HEIGHT = 220;
const MAP_FALLBACK_MESSAGE = "Map could not load. Please enable GPS and try again.";

function RoutePolylines({
  route,
  strokePrimary,
  strokeOutline
}: {
  route: MapCoordinate[];
  strokePrimary: string;
  strokeOutline: string;
}) {
  if (route.length < 2) return null;

  return (
    <>
      <Polyline
        coordinates={route}
        strokeColor={strokeOutline}
        strokeWidth={8}
        lineCap="round"
        lineJoin="round"
        geodesic
        zIndex={1}
      />
      <Polyline
        coordinates={route}
        strokeColor={strokePrimary}
        strokeWidth={4}
        lineCap="round"
        lineJoin="round"
        geodesic
        zIndex={2}
      />
    </>
  );
}

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
  errorMessage,
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
  }, [
    locationGranted,
    safeFit,
    safeMarkers.length,
    safeRegion.latitude,
    safeRegion.longitude,
    safeRoute.length,
    showsUserLocation
  ]);

  const canRenderMap = useMemo(() => {
    if (errorMessage) return false;
    if (!permissionResolved || loading) return false;
    if (locationDenied) return false;
    if (!hasValidMapCoords(safeRegion.latitude, safeRegion.longitude)) return false;
    if (!hasRenderableCoordinates) return false;
    if (showsUserLocation && !locationGranted) return false;
    return true;
  }, [
    errorMessage,
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
      followsUserLocation: allowFollowUser,
      mapType: FIELD_MAP_TYPE
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
    errorMessage ??
    emptyMessage ??
    (locationDenied
      ? "Location not available. Please enable GPS and try again."
      : loading || !permissionResolved
        ? "Loading map…"
        : MAP_FALLBACK_MESSAGE);

  const shellBg = theme.colors.cardMuted ?? "#e8f0ea";
  const placeholderColor = theme.colors.muted ?? "#6B7F74";

  return (
    <MapErrorBoundary height={mapHeight} screenName={screenName} fallbackMessage={placeholderMessage}>
      <View
        style={[
          styles.shell,
          { height: mapHeight, width: shellWidth, minHeight: MIN_MAP_HEIGHT, backgroundColor: shellBg }
        ]}
      >
        {!canRenderMap ? (
          <View style={styles.placeholder}>
            {loading || !permissionResolved ? (
              <>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.placeholderText, { color: placeholderColor }]}>{placeholderMessage}</Text>
              </>
            ) : errorMessage ? (
              <>
                <Ionicons name="alert-circle-outline" size={32} color={theme.colors.warning ?? "#C2410C"} />
                <Text style={[styles.placeholderTitle, { color: theme.colors.text }]}>Map unavailable</Text>
                <Text style={[styles.placeholderText, { color: placeholderColor }]}>{placeholderMessage}</Text>
              </>
            ) : !hasRenderableCoordinates ? (
              <>
                <Ionicons name="map-outline" size={32} color={placeholderColor} />
                <Text style={[styles.placeholderText, { color: placeholderColor }]}>
                  {emptyMessage ?? "No location to show yet."}
                </Text>
              </>
            ) : (
              <Text style={[styles.placeholderText, { color: placeholderColor }]}>{placeholderMessage}</Text>
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
            showsCompass={false}
            loadingEnabled
            mapType={FIELD_MAP_TYPE}
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
            <RoutePolylines
              route={safeRoute}
              strokePrimary={theme.colors.primaryDark}
              strokeOutline="rgba(255,255,255,0.92)"
            />
            {safeMarkers.map((m) => (
              <FieldMapMarker
                key={m.id}
                id={m.id}
                latitude={m.lat}
                longitude={m.lng}
                title={m.title}
                description={m.description}
                kind={m.kind}
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
    gap: 10,
    justifyContent: "center",
    minHeight: MIN_MAP_HEIGHT,
    padding: 20
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  }
});
