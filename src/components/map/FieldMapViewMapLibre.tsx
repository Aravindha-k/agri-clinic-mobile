import { Ionicons } from "@expo/vector-icons";
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type CameraRef
} from "@maplibre/maplibre-react-native";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject
} from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import {
  isMapStyleConfigured,
  MAP_STYLE_MISSING_MESSAGE,
  MAP_UNAVAILABLE_MESSAGE,
  resolveMapStyleUrl
} from "../../config/mapStyle";
import { useTheme } from "../../theme";
import { hasValidMapCoords, parseMapCoord, filterMapCoordinates } from "../../utils/mapCoords";
import { logMapDiagnostics } from "../../utils/mapDebug";
import { sanitizeRegion } from "../../utils/mapRegion";
import {
  circlePolygonGeoJson,
  coordinatesToBounds,
  regionToViewState,
  type FieldMapCameraRef
} from "./fieldMapCamera";
import { FieldMapMarker } from "./FieldMapMarker";
import { MapErrorBoundary } from "./MapErrorBoundary";
import type { FieldMapViewProps, MapCoordinate, MapPin } from "./FieldMapView.types";

type Props = FieldMapViewProps & {
  mapRef?: RefObject<FieldMapCameraRef | null>;
};

const MIN_MAP_HEIGHT = 220;
const MAP_FALLBACK_MESSAGE = "Map could not load. Please enable GPS and try again.";

const ROUTE_SOURCE_ID = "field-route-source";
const ROUTE_OUTLINE_LAYER_ID = "field-route-outline";
const ROUTE_LINE_LAYER_ID = "field-route-line";
const ACCURACY_SOURCE_ID = "field-accuracy-source";
const ACCURACY_OUTER_LAYER_ID = "field-accuracy-outer";
const ACCURACY_INNER_LAYER_ID = "field-accuracy-inner";

export function FieldMapViewMapLibre({
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
  const mapStyleUrl = resolveMapStyleUrl();
  const mapStyleConfigured = isMapStyleConfigured();

  const cameraRef = useRef<CameraRef>(null);
  const internalRef = useRef<FieldMapCameraRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyleFailed, setMapStyleFailed] = useState(false);
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
        route
          .map((p) => {
            const lat = parseMapCoord(p.latitude);
            const lng = parseMapCoord(p.longitude);
            if (lat == null || lng == null) return null;
            return { latitude: lat, longitude: lng };
          })
          .filter(Boolean) as MapCoordinate[]
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

  const canRenderMap = useMemo(() => {
    if (!mapStyleConfigured || !mapStyleUrl || mapStyleFailed) return false;
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
    mapStyleConfigured,
    mapStyleFailed,
    mapStyleUrl,
    permissionResolved,
    safeRegion.latitude,
    safeRegion.longitude,
    showsUserLocation
  ]);

  const allowFollowUser =
    canRenderMap && mapReady && followsUserLocation && showsUserLocation && locationGranted;

  const routeGeoJson = useMemo(() => {
    if (safeRoute.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: safeRoute.map((point) => [point.longitude, point.latitude] as [number, number])
      }
    };
  }, [safeRoute]);

  const accuracyGeoJson = useMemo(() => {
    if (
      !accuracyCircle ||
      !hasValidMapCoords(accuracyCircle.center.latitude, accuracyCircle.center.longitude)
    ) {
      return null;
    }
    const innerRadius = Math.min(Math.max(accuracyCircle.radiusMeters, 10), 60);
    const outerRadius = Math.min(
      Math.max(accuracyCircle.outerRadiusMeters ?? accuracyCircle.radiusMeters, 18),
      120
    );
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          ...circlePolygonGeoJson(accuracyCircle.center, outerRadius),
          properties: { ring: "outer" }
        },
        {
          ...circlePolygonGeoJson(accuracyCircle.center, innerRadius),
          properties: { ring: "inner" }
        }
      ]
    };
  }, [accuracyCircle]);

  const initialViewState = useMemo(() => regionToViewState(safeRegion), [safeRegion]);

  const outlineWidth = routeStyle === "compact" ? 4 : 7;
  const primaryWidth = routeStyle === "compact" ? 2 : 3.5;
  const strokePrimary = routeStrokePrimary ?? theme.colors.primaryDark;
  const strokeOutline = routeStrokeOutline ?? "rgba(255,255,255,0.92)";

  useImperativeHandle(
    externalRef ?? internalRef,
    () => ({
      fitToCoordinates: (coords, options) => {
        const bounds = coordinatesToBounds(
          coords
            .map((point) => {
              const lat = parseMapCoord(point.latitude);
              const lng = parseMapCoord(point.longitude);
              if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
              return { latitude: lat, longitude: lng };
            })
            .filter(Boolean) as MapCoordinate[]
        );
        if (!bounds || !cameraRef.current) return;
        const padding = options?.edgePadding ?? fitEdgePadding;
        cameraRef.current.fitBounds(bounds, {
          ...padding,
          duration: options?.animated === false ? 0 : 450,
          easing: "ease"
        });
      },
      animateToRegion: (nextRegion, duration = 350) => {
        const view = regionToViewState(sanitizeRegion(nextRegion));
        cameraRef.current?.easeTo({
          center: view.center,
          zoom: view.zoom,
          duration
        });
      }
    }),
    [fitEdgePadding]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setMapReady(false);
    setMapStyleFailed(false);
    cameraAppliedRef.current = false;
  }, [
    permissionResolved,
    locationDenied,
    locationGranted,
    safeRegion.latitude,
    safeRegion.longitude,
    safeMarkers.length,
    safeRoute.length,
    safeFit?.length ?? 0,
    mapStyleUrl
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
      mapType: "maplibre"
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
    if (!cameraRef.current || !mapReady || !canRenderMap || !mountedRef.current || cameraAppliedRef.current) {
      return;
    }

    try {
      if (safeFit && safeFit.length >= 2) {
        const bounds = coordinatesToBounds(safeFit);
        if (bounds) {
          cameraRef.current.fitBounds(bounds, {
            ...fitEdgePadding,
            duration: 450,
            easing: "ease"
          });
          cameraAppliedRef.current = true;
        }
        return;
      }

      if (safeFit?.length === 1) {
        const point = safeFit[0];
        const view = regionToViewState(
          sanitizeRegion({
            latitude: point.latitude,
            longitude: point.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
          })
        );
        cameraRef.current.easeTo({ center: view.center, zoom: view.zoom, duration: 400 });
        cameraAppliedRef.current = true;
      }
    } catch (err) {
      console.warn(`[Map:${screenName}] camera error`, err instanceof Error ? err.message : err);
    }
  }, [canRenderMap, fitEdgePadding, mapReady, safeFit, screenName]);

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

    const view = regionToViewState(
      sanitizeRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: liveFocusDelta,
        longitudeDelta: liveFocusDelta
      })
    );
    try {
      cameraRef.current?.easeTo({ center: view.center, zoom: view.zoom, duration: 480 });
    } catch {
      // ignore animation errors
    }
  }, [
    canRenderMap,
    followsUserLocation,
    liveFocus?.latitude,
    liveFocus?.longitude,
    liveFocusDelta,
    mapReady
  ]);

  const mapHeight = height > 0 ? height : MIN_MAP_HEIGHT;
  const shellWidth = Math.max(width, 1);

  const placeholderMessage = !mapStyleConfigured
    ? MAP_STYLE_MISSING_MESSAGE
    : mapStyleFailed
      ? MAP_UNAVAILABLE_MESSAGE
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
    <MapErrorBoundary height={mapHeight} screenName={screenName} fallbackMessage={MAP_UNAVAILABLE_MESSAGE}>
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
            ) : errorMessage || mapStyleFailed || !mapStyleConfigured ? (
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
          <Map
            style={styles.map}
            mapStyle={mapStyleUrl!}
            androidView={interactive ? "surface" : "texture"}
            logo={false}
            attribution
            attributionPosition={{ bottom: 4, right: 4 }}
            compass={false}
            dragPan={interactive}
            touchZoom={interactive}
            doubleTapZoom={interactive}
            touchRotate={interactive}
            touchPitch={false}
            onDidFinishLoadingMap={() => {
              if (mountedRef.current) setMapReady(true);
            }}
            onDidFailLoadingMap={() => {
              if (mountedRef.current) setMapStyleFailed(true);
            }}
          >
            <Camera
              ref={cameraRef}
              initialViewState={initialViewState}
              trackUserLocation={allowFollowUser ? "default" : undefined}
            />
            {showsUserLocation && locationGranted && !locationDenied ? (
              <UserLocation animated accuracy={Boolean(accuracyCircle)} />
            ) : null}
            {routeGeoJson ? (
              <GeoJSONSource id={ROUTE_SOURCE_ID} data={routeGeoJson}>
                <Layer
                  id={ROUTE_OUTLINE_LAYER_ID}
                  type="line"
                  source={ROUTE_SOURCE_ID}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round"
                  }}
                  paint={{
                    "line-color": strokeOutline,
                    "line-width": outlineWidth
                  }}
                />
                <Layer
                  id={ROUTE_LINE_LAYER_ID}
                  type="line"
                  source={ROUTE_SOURCE_ID}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round"
                  }}
                  paint={{
                    "line-color": strokePrimary,
                    "line-width": primaryWidth
                  }}
                />
              </GeoJSONSource>
            ) : null}
            {accuracyGeoJson ? (
              <GeoJSONSource id={ACCURACY_SOURCE_ID} data={accuracyGeoJson}>
                <Layer
                  id={ACCURACY_OUTER_LAYER_ID}
                  type="fill"
                  source={ACCURACY_SOURCE_ID}
                  filter={["==", ["get", "ring"], "outer"]}
                  paint={{
                    "fill-color": "rgba(59, 130, 246, 0.08)",
                    "fill-outline-color": "rgba(59, 130, 246, 0.45)"
                  }}
                />
                <Layer
                  id={ACCURACY_INNER_LAYER_ID}
                  type="fill"
                  source={ACCURACY_SOURCE_ID}
                  filter={["==", ["get", "ring"], "inner"]}
                  paint={{
                    "fill-color": "rgba(59, 130, 246, 0.22)",
                    "fill-outline-color": "rgba(59, 130, 246, 0.55)"
                  }}
                />
              </GeoJSONSource>
            ) : null}
            {safeMarkers.map((marker) => (
              <FieldMapMarker
                key={marker.id}
                id={marker.id}
                latitude={marker.lat}
                longitude={marker.lng}
                title={marker.title}
                description={marker.description}
                kind={marker.kind}
                compact={compactMarkers}
              />
            ))}
          </Map>
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
    flex: 1,
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
