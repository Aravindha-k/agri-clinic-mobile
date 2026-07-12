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
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  MAP_TILES_LOAD_FAILED_MESSAGE,
  MAP_UNAVAILABLE_MESSAGE,
  resolveMapStyleUrl
} from "../../config/mapStyle";
import { logMapStyleEvent } from "../../config/mapStyleDiagnostics";
import { useMapForegroundPermission } from "../../hooks/useMapForegroundPermission";
import { useTheme } from "../../theme";
import { hasValidMapCoords, parseMapCoord, filterMapCoordinates } from "../../utils/mapCoords";
import { logMapDiagnostics } from "../../utils/mapDebug";
import { validateMapStyleUrl } from "../../utils/mapStyleValidation";
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

const ROUTE_SOURCE_ID = "field-route-source";
const ROUTE_OUTLINE_LAYER_ID = "field-route-outline";
const ROUTE_LINE_LAYER_ID = "field-route-line";
const ACCURACY_SOURCE_ID = "field-accuracy-source";
const ACCURACY_OUTER_LAYER_ID = "field-accuracy-outer";
const ACCURACY_INNER_LAYER_ID = "field-accuracy-inner";

function resolveLiveLocationFlags(props: FieldMapViewProps) {
  const showLiveUserLocation = props.showLiveUserLocation ?? props.showsUserLocation ?? false;
  const followLiveUserLocation = props.followLiveUserLocation ?? props.followsUserLocation ?? false;
  return { showLiveUserLocation, followLiveUserLocation };
}

export function FieldMapViewMapLibre(props: Props) {
  const {
    screenName = "FieldMapView",
    height,
    width,
    region,
    markers = [],
    route = [],
    fitCoordinates,
    fitEdgePadding = { top: 80, right: 60, bottom: 140, left: 60 },
    loading = false,
    permissionResolved = true,
    locationDenied = false,
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
  } = props;

  const { showLiveUserLocation, followLiveUserLocation } = resolveLiveLocationFlags(props);
  const foreground = useMapForegroundPermission(showLiveUserLocation);

  const { theme } = useTheme();
  const mapStyleUrl = useMemo(() => resolveMapStyleUrl(), []);

  const cameraRef = useRef<CameraRef>(null);
  const internalRef = useRef<FieldMapCameraRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const cameraAppliedRef = useRef(false);

  const canMountUserLocation =
    showLiveUserLocation &&
    foreground.resolved &&
    foreground.granted &&
    foreground.servicesEnabled &&
    !foreground.denied;

  const canFollowLive =
    followLiveUserLocation && canMountUserLocation && mapReady && !locationDenied;

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

  const hasOverlayData = useMemo(() => {
    if (safeMarkers.length > 0) return true;
    if (safeRoute.length >= 1) return true;
    if (safeFit && safeFit.length > 0) return true;
    return false;
  }, [safeFit, safeMarkers.length, safeRoute.length]);

  const shouldMountMap = permissionResolved && !loading && !errorMessage;

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
      !canMountUserLocation ||
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
  }, [accuracyCircle, canMountUserLocation]);

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
    logMapStyleEvent("map_style_load_started", mapStyleUrl, { screenName });
    void validateMapStyleUrl(mapStyleUrl).then((result) => {
      if (!mountedRef.current) return;
      if (result.ok) {
        logMapStyleEvent("map_style_loaded", mapStyleUrl, { screenName });
      } else {
        logMapStyleEvent("map_style_load_failed", mapStyleUrl, {
          screenName,
          errorCode: result.reason ?? "validation_failed"
        });
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, [mapStyleUrl, screenName]);

  useEffect(() => {
    setMapReady(false);
    setMapLoadError(null);
    cameraAppliedRef.current = false;
  }, [mapStyleUrl, permissionResolved, loading]);

  useEffect(() => {
    logMapDiagnostics(screenName, {
      permissionResolved,
      locationDenied,
      locationGranted: foreground.granted,
      rawLatitude: region.latitude,
      rawLongitude: region.longitude,
      sanitizedLatitude: safeRegion.latitude,
      sanitizedLongitude: safeRegion.longitude,
      region: safeRegion,
      mapReady,
      shouldMountMap,
      markerCount: safeMarkers.length,
      routePointCount: safeRoute.length,
      showsUserLocation: showLiveUserLocation,
      followsUserLocation: canFollowLive,
      mapType: "maplibre",
      mapStyleUrl
    });
  }, [
    canFollowLive,
    foreground.granted,
    locationDenied,
    mapReady,
    mapStyleUrl,
    permissionResolved,
    region.latitude,
    region.longitude,
    safeMarkers.length,
    safeRegion,
    safeRoute.length,
    screenName,
    shouldMountMap,
    showLiveUserLocation
  ]);

  const applyCamera = useCallback(() => {
    if (!cameraRef.current || !mapReady || !shouldMountMap || !mountedRef.current || cameraAppliedRef.current) {
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
  }, [fitEdgePadding, mapReady, safeFit, screenName, shouldMountMap]);

  useEffect(() => {
    if (!mapReady || !shouldMountMap) return;
    const timer = setTimeout(() => applyCamera(), 350);
    return () => clearTimeout(timer);
  }, [applyCamera, mapReady, shouldMountMap]);

  const lastLiveFocusAtRef = useRef(0);
  useEffect(() => {
    if (!liveFocus || !mapReady || !shouldMountMap || !canFollowLive) return;
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
  }, [canFollowLive, liveFocus?.latitude, liveFocus?.longitude, liveFocusDelta, mapReady, shouldMountMap]);

  const mapHeight = height > 0 ? height : MIN_MAP_HEIGHT;
  const shellWidth = Math.max(width, 1);
  const shellBg = "#F4F6F5";
  const mutedColor = theme.colors.muted ?? "#6B7F74";
  const tileError = mapLoadError;

  return (
    <MapErrorBoundary height={mapHeight} screenName={screenName} fallbackMessage={MAP_UNAVAILABLE_MESSAGE}>
      <View
        style={[
          styles.shell,
          { height: mapHeight, width: shellWidth, minHeight: mapHeight, backgroundColor: shellBg }
        ]}
      >
        {!shouldMountMap ? (
          <View style={styles.centered}>
            {loading || !permissionResolved ? (
              <>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.message, { color: mutedColor }]}>Loading map…</Text>
              </>
            ) : (
              <Text style={[styles.message, { color: mutedColor }]}>{errorMessage ?? "Map unavailable."}</Text>
            )}
          </View>
        ) : (
          <>
            <Map
              style={styles.map}
              mapStyle={mapStyleUrl}
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
                if (mountedRef.current) {
                  setMapReady(true);
                  setMapLoadError(null);
                  logMapStyleEvent("map_style_loaded", mapStyleUrl, { screenName });
                }
              }}
              onDidFailLoadingMap={() => {
                if (mountedRef.current) {
                  setMapLoadError(MAP_TILES_LOAD_FAILED_MESSAGE);
                  logMapStyleEvent("map_style_load_failed", mapStyleUrl, {
                    screenName,
                    errorCode: "native_map_load_failed"
                  });
                }
              }}
            >
              <Camera ref={cameraRef} initialViewState={initialViewState} />
              {canMountUserLocation ? (
                <UserLocation animated accuracy={Boolean(accuracyCircle && canMountUserLocation)} />
              ) : null}
              {routeGeoJson ? (
                <GeoJSONSource id={ROUTE_SOURCE_ID} data={routeGeoJson}>
                  <Layer
                    id={ROUTE_OUTLINE_LAYER_ID}
                    type="line"
                    source={ROUTE_SOURCE_ID}
                    layout={{ "line-cap": "round", "line-join": "round" }}
                    paint={{ "line-color": strokeOutline, "line-width": outlineWidth }}
                  />
                  <Layer
                    id={ROUTE_LINE_LAYER_ID}
                    type="line"
                    source={ROUTE_SOURCE_ID}
                    layout={{ "line-cap": "round", "line-join": "round" }}
                    paint={{ "line-color": strokePrimary, "line-width": primaryWidth }}
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

            {!mapReady && !tileError ? (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null}

            {tileError ? (
              <View style={styles.tileBanner}>
                <Ionicons name="cloud-offline-outline" size={18} color="#475569" />
                <Text style={styles.tileBannerText}>{tileError}</Text>
              </View>
            ) : null}

            {showLiveUserLocation && foreground.resolved && !canMountUserLocation && !tileError ? (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Location permission off — route and visit markers still shown.
                </Text>
              </View>
            ) : null}

            {!hasOverlayData && mapReady && !tileError ? (
              <View style={styles.emptyBanner} pointerEvents="none">
                <Text style={styles.emptyBannerText}>
                  {emptyMessage ?? "Waiting for GPS or visit locations…"}
                </Text>
              </View>
            ) : null}
          </>
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
  centered: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    padding: 20
  },
  message: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
    justifyContent: "center"
  },
  tileBanner: {
    alignItems: "center",
    backgroundColor: "rgba(248, 250, 252, 0.96)",
    borderTopColor: "rgba(100, 116, 139, 0.2)",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    right: 0
  },
  tileBannerText: {
    color: "#475569",
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16
  },
  infoBanner: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopColor: "rgba(100, 116, 139, 0.15)",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    right: 0
  },
  infoBannerText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center"
  },
  emptyBanner: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderTopColor: "rgba(11, 90, 56, 0.12)",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    right: 0
  },
  emptyBannerText: {
    color: "#6B7F74",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center"
  }
});
