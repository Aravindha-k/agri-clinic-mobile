import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type MapViewType from "react-native-maps";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Polyline } from "react-native-maps";
import { useTheme } from "../../theme";
import { FIELD_MAP_TYPE } from "../../types/mapType";
import type { MapRegion } from "../../types/map";
import { hasValidMapCoords, parseMapCoord, filterMapCoordinates } from "../../utils/mapCoords";
import {
  isAndroidMapsNativeConfigured,
  MAP_CONFIG_UNAVAILABLE_MESSAGE
} from "../../utils/mapsNativeConfig";
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
  strokeOutline,
  routeStyle = "default"
}: {
  route: MapCoordinate[];
  strokePrimary: string;
  strokeOutline: string;
  routeStyle?: "default" | "compact";
}) {
  if (route.length < 2) return null;

  const outlineWidth = routeStyle === "compact" ? 4 : 7;
  const primaryWidth = routeStyle === "compact" ? 2 : 3.5;

  return (
    <>
      <Polyline
        coordinates={route}
        strokeColor={strokeOutline}
        strokeWidth={outlineWidth}
        lineCap="round"
        lineJoin="round"
        geodesic
        zIndex={1}
      />
      <Polyline
        coordinates={route}
        strokeColor={strokePrimary}
        strokeWidth={primaryWidth}
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
  mapRef: externalRef,
  routeStrokePrimary,
  routeStrokeOutline,
  routeStyle = "default",
  compactMarkers = false,
  interactive = true,
  liveFocus,
  liveFocusDelta = 0.006
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
      filterMapCoordinates(
        route.map((p) => {
          const lat = parseMapCoord(p.latitude);
          const lng = parseMapCoord(p.longitude);
          if (lat == null || lng == null) return null;
          return { latitude: lat, longitude: lng };
        })
      ),
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
    if (safeRoute.length >= 1) return true;
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

  const mapsNativeConfigured = Platform.OS !== "android" || isAndroidMapsNativeConfigured();

  const canRenderMap = useMemo(() => {
    if (!mapsNativeConfigured) return false;
    if (errorMessage) return false;
    if (!permissionResolved || loading) return false;
    if (locationDenied && !hasRenderableCoordinates) return false;
    if (!hasValidMapCoords(safeRegion.latitude, safeRegion.longitude)) return false;
    if (!hasRenderableCoordinates) return false;
    return true;
  }, [
    errorMessage,
    hasRenderableCoordinates,
    loading,
    locationDenied,
    locationGranted,
    mapsNativeConfigured,
    permissionResolved,
    safeRegion.latitude,
    safeRegion.longitude,
    showsUserLocation
  ]);

  const allowFollowUser =
    canRenderMap && mapReady && followsUserLocation && showsUserLocation && locationGranted;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setMapReady(false);
    cameraAppliedRef.current = false;
  }, [
    permissionResolved,
    locationDenied,
    locationGranted,
    safeRegion.latitude,
    safeRegion.longitude,
    safeMarkers.length,
    safeRoute.length,
    safeFit?.length ?? 0
  ]);

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

  const lastLiveFocusAtRef = useRef(0);
  useEffect(() => {
    if (!liveFocus || !mapReady || !canRenderMap || !followsUserLocation) return;
    const lat = parseMapCoord(liveFocus.latitude);
    const lng = parseMapCoord(liveFocus.longitude);
    if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return;

    const now = Date.now();
    if (now - lastLiveFocusAtRef.current < 700) return;
    lastLiveFocusAtRef.current = now;

    const map = mapRef.current;
    if (!map) return;
    try {
      map.animateToRegion(
        sanitizeRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: liveFocusDelta,
          longitudeDelta: liveFocusDelta
        }),
        480
      );
    } catch {
      // ignore animation errors
    }
  }, [
    canRenderMap,
    followsUserLocation,
    liveFocus?.latitude,
    liveFocus?.longitude,
    liveFocusDelta,
    mapReady,
    mapRef
  ]);

  const mapHeight = height > 0 ? height : MIN_MAP_HEIGHT;
  const shellWidth = Math.max(width, 1);

  const placeholderMessage =
    !mapsNativeConfigured
      ? MAP_CONFIG_UNAVAILABLE_MESSAGE
      : errorMessage ??
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
          { height: mapHeight, width: shellWidth, minHeight: mapHeight, backgroundColor: shellBg }
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
            rotateEnabled={interactive}
            toolbarEnabled={false}
            scrollEnabled={interactive}
            zoomEnabled={interactive}
            zoomTapEnabled={interactive}
            moveOnMarkerPress={false}
          >
            {accuracyCircle &&
            hasValidMapCoords(accuracyCircle.center.latitude, accuracyCircle.center.longitude) ? (
              <>
                <Circle
                  center={accuracyCircle.center}
                  radius={Math.min(
                    Math.max(accuracyCircle.outerRadiusMeters ?? accuracyCircle.radiusMeters, 18),
                    120
                  )}
                  strokeColor="rgba(59, 130, 246, 0.45)"
                  fillColor="rgba(59, 130, 246, 0.08)"
                  strokeWidth={2}
                  zIndex={1}
                />
                <Circle
                  center={accuracyCircle.center}
                  radius={Math.min(Math.max(accuracyCircle.radiusMeters, 10), 60)}
                  strokeColor="rgba(59, 130, 246, 0.55)"
                  fillColor="rgba(59, 130, 246, 0.22)"
                  strokeWidth={1.5}
                  zIndex={2}
                />
              </>
            ) : null}
            <RoutePolylines
              route={safeRoute}
              strokePrimary={routeStrokePrimary ?? theme.colors.primaryDark}
              strokeOutline={routeStrokeOutline ?? "rgba(255,255,255,0.92)"}
              routeStyle={routeStyle}
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
                compact={compactMarkers}
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
    ...StyleSheet.absoluteFillObject
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
