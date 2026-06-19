import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import * as Location from "expo-location";
import { FieldMapView } from "./FieldMapView";
import { MapErrorBoundary } from "./MapErrorBoundary";
import type { MapPin } from "./FieldMapView.types";
import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";
import { DEFAULT_MAP_REGION, fitMapRegion, sanitizeRegion } from "../../utils/mapRegion";

const DEFAULT_HEIGHT = 200;
const DELTA = 0.012;

type Props = {
  height?: number;
  latitude?: string | number | null;
  longitude?: string | number | null;
  title?: string;
  description?: string;
  /** Show device location alongside the pinned point. */
  showLiveLocation?: boolean;
  markerKind?: "visit" | "farmer";
  loading?: boolean;
  emptyMessage?: string;
};

export function LocationPreviewMap({
  height = DEFAULT_HEIGHT,
  latitude,
  longitude,
  title,
  description,
  showLiveLocation = false,
  markerKind = "visit",
  loading: externalLoading = false,
  emptyMessage = "No GPS recorded for this location yet."
}: Props) {
  const { width } = useWindowDimensions();
  const mapWidth = Math.max(width - 48, 280);

  const [live, setLive] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionResolved, setPermissionResolved] = useState(!showLiveLocation);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locLoading, setLocLoading] = useState(showLiveLocation);

  const pinLat = parseMapCoord(latitude);
  const pinLng = parseMapCoord(longitude);
  const hasPin = pinLat != null && pinLng != null && hasValidMapCoords(pinLat, pinLng);

  useEffect(() => {
    if (!showLiveLocation) return;
    let cancelled = false;

    void (async () => {
      setLocLoading(true);
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          if (!cancelled) {
            setLocationGranted(false);
            setLive(null);
          }
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        if (!cancelled && hasValidMapCoords(lat, lng)) {
          setLive({ lat, lng });
          setLocationGranted(true);
        }
      } catch {
        if (!cancelled) {
          setLive(null);
          setLocationGranted(false);
        }
      } finally {
        if (!cancelled) {
          setPermissionResolved(true);
          setLocLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showLiveLocation]);

  const markers = useMemo((): MapPin[] => {
    if (!hasPin) return [];
    return [
      {
        id: "location-pin",
        lat: pinLat!,
        lng: pinLng!,
        title: title ?? "Field location",
        description,
        kind: markerKind
      }
    ];
  }, [description, hasPin, markerKind, pinLat, pinLng, title]);

  const fitCoordinates = useMemo(() => {
    const coords = [];
    if (hasPin) coords.push({ latitude: pinLat!, longitude: pinLng! });
    if (live) coords.push({ latitude: live.lat, longitude: live.lng });
    return coords.length ? coords : undefined;
  }, [hasPin, live, pinLat, pinLng]);

  const region = useMemo(() => {
    const points = [
      ...(hasPin ? [{ lat: pinLat!, lng: pinLng! }] : []),
      ...(live ? [{ lat: live.lat, lng: live.lng }] : [])
    ];
    if (points.length) return fitMapRegion(points);
    if (hasPin) {
      return sanitizeRegion({
        latitude: pinLat!,
        longitude: pinLng!,
        latitudeDelta: DELTA,
        longitudeDelta: DELTA
      });
    }
    return DEFAULT_MAP_REGION;
  }, [hasPin, live, pinLat, pinLng]);

  const loading = externalLoading || locLoading;
  const canRender = hasPin || (showLiveLocation && locationGranted && live != null);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.fallback, { height, width: mapWidth }]}>
        <Ionicons name="map-outline" size={28} color="#6B7F74" />
        <Text style={styles.fallbackText}>Map available on Android/iOS app</Text>
      </View>
    );
  }

  if (!canRender && !loading && permissionResolved) {
    return (
      <View style={[styles.fallback, { height, width: mapWidth }]}>
        <Ionicons name="location-outline" size={28} color="#6B7F74" />
        <Text style={styles.fallbackText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <MapErrorBoundary height={height} screenName="LocationPreviewMap" fallbackMessage={emptyMessage}>
      <FieldMapView
        screenName="LocationPreviewMap"
        height={height}
        width={mapWidth}
        region={region}
        markers={markers}
        fitCoordinates={fitCoordinates}
        fitEdgePadding={{ top: 48, right: 48, bottom: 48, left: 48 }}
        showsUserLocation={showLiveLocation && locationGranted}
        locationGranted={locationGranted || hasPin}
        permissionResolved={permissionResolved}
        loading={loading}
        emptyMessage={emptyMessage}
      />
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: "#e8f0ea",
    borderRadius: 16,
    gap: 8,
    justifyContent: "center",
    overflow: "hidden",
    padding: 16
  },
  fallbackText: {
    color: "#6B7F74",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  }
});
