import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type MapViewType from "react-native-maps";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Polyline, Region } from "react-native-maps";
import { useTheme } from "../../theme";
import { hasValidMapCoords } from "../../utils/mapCoords";
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
  /** When false, show placeholder until permission check completes. */
  permissionResolved?: boolean;
  locationDenied?: boolean;
  emptyMessage?: string;
  accuracyCircle?: { center: MapCoordinate; radiusMeters: number };
  mapRef?: RefObject<MapViewType | null>;
};

export function FieldMapView({
  height,
  width,
  region,
  markers = [],
  route = [],
  fitCoordinates,
  fitEdgePadding = { top: 80, right: 60, bottom: 140, left: 60 },
  showsUserLocation = true,
  followsUserLocation = false,
  loading = false,
  permissionResolved = true,
  locationDenied = false,
  emptyMessage,
  accuracyCircle,
  mapRef: externalRef
}: Props) {
  const { theme } = useTheme();
  const internalRef = useRef<MapView>(null);
  const mapRef = externalRef ?? internalRef;
  const [mapReady, setMapReady] = useState(false);
  const mountedRef = useRef(true);
  const safeRegion = useMemo(() => sanitizeRegion(region), [region]);

  const safeMarkers = useMemo(
    () => markers.filter((m) => hasValidMapCoords(m.lat, m.lng)),
    [markers]
  );
  const safeRoute = useMemo(
    () => route.filter((p) => hasValidMapCoords(p.latitude, p.longitude)),
    [route]
  );
  const safeFit = useMemo(
    () => fitCoordinates?.filter((p) => hasValidMapCoords(p.latitude, p.longitude)),
    [fitCoordinates]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyCamera = useCallback(() => {
    const map = mapRef.current;
    if (!map || loading || !mapReady || !mountedRef.current) {
      return;
    }

    try {
      if (safeFit && safeFit.length >= 2) {
        map.fitToCoordinates(safeFit, {
          edgePadding: fitEdgePadding,
          animated: true
        });
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
        return;
      }

      map.animateToRegion(safeRegion, 400);
    } catch {
      /* ignore map animation errors */
    }
  }, [fitEdgePadding, loading, mapReady, mapRef, safeFit, safeRegion]);

  useEffect(() => {
    if (loading || !mapReady || !permissionResolved) {
      return;
    }
    const timer = setTimeout(() => applyCamera(), 300);
    return () => clearTimeout(timer);
  }, [applyCamera, loading, mapReady, permissionResolved, safeFit?.length, safeRoute.length]);

  const mapHeight = Math.max(height, 200);
  const shellWidth = Math.max(width, 1);
  const canRenderMap =
    permissionResolved &&
    !loading &&
    !locationDenied &&
    hasValidMapCoords(safeRegion.latitude, safeRegion.longitude);

  const placeholderMessage =
    emptyMessage ??
    (locationDenied
      ? "Location not available. Please enable GPS and try again."
      : loading || !permissionResolved
        ? "Loading map…"
        : "Location not available. Please enable GPS and try again.");

  if (Platform.OS === "web") {
    return (
      <View style={[styles.shell, { height: mapHeight, width: shellWidth, backgroundColor: theme.colors.cardMuted }]}>
        <Text style={styles.placeholderText}>Map available on Android/iOS app</Text>
      </View>
    );
  }

  return (
    <MapErrorBoundary height={mapHeight} fallbackMessage={placeholderMessage}>
      <View style={[styles.shell, { height: mapHeight, width: shellWidth }]}>
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
            style={StyleSheet.absoluteFill}
            initialRegion={safeRegion}
            onMapReady={() => {
              if (mountedRef.current) {
                setMapReady(true);
              }
            }}
            showsUserLocation={showsUserLocation && !locationDenied}
            showsMyLocationButton={Platform.OS === "android" && showsUserLocation && !locationDenied}
            followsUserLocation={followsUserLocation && !locationDenied}
            showsCompass
            loadingEnabled
            mapType="standard"
            userInterfaceStyle="light"
            pitchEnabled={false}
            rotateEnabled={false}
            toolbarEnabled={false}
          >
            {accuracyCircle && hasValidMapCoords(accuracyCircle.center.latitude, accuracyCircle.center.longitude) ? (
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
                pinColor={m.pinColor}
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
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
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
