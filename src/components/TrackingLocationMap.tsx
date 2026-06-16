import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { MapRegion } from "../types/map";
import { FieldMapView } from "./map/FieldMapView";
import { MapErrorBoundary } from "./map/MapErrorBoundary";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";
import { getForegroundLocation } from "../utils/location";
import { hasValidMapCoords, parseMapCoord } from "../utils/mapCoords";
import { DEFAULT_MAP_REGION, sanitizeRegion } from "../utils/mapRegion";

const MAP_HEIGHT = 280;
const DELTA = 0.014;

type Props = {
  isActive: boolean;
  serverLatitude?: string | null;
  serverLongitude?: string | null;
  accuracyMeters?: number | null;
};

export function TrackingLocationMap({ isActive, serverLatitude, serverLongitude, accuracyMeters }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const mountedRef = useRef(true);
  const permissionLoadedRef = useRef(false);
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLng, setLiveLng] = useState<number | null>(null);
  const [permissionResolved, setPermissionResolved] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  const slat = hasValidMapCoords(serverLatitude, serverLongitude) ? parseMapCoord(serverLatitude) : null;
  const slng = hasValidMapCoords(serverLatitude, serverLongitude) ? parseMapCoord(serverLongitude) : null;
  const hasServerPin = slat != null && slng != null;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      mountedRef.current = true;

      if (!permissionLoadedRef.current && !hasServerPin) {
        setPermissionResolved(false);
      }

      void (async () => {
        try {
          const r = await getForegroundLocation();
          if (cancelled || !mountedRef.current) return;

          permissionLoadedRef.current = true;

          if (!r.granted) {
            setLocDenied(true);
            setLocationGranted(false);
            setLiveLat(null);
            setLiveLng(null);
          } else {
            const lat = r.location.coords.latitude;
            const lng = r.location.coords.longitude;
            if (hasValidMapCoords(lat, lng)) {
              setLiveLat(lat);
              setLiveLng(lng);
              setLocDenied(false);
              setLocationGranted(true);
            } else {
              setLocDenied(true);
              setLocationGranted(false);
              setLiveLat(null);
              setLiveLng(null);
            }
          }
        } catch {
          if (!cancelled && mountedRef.current) {
            setLocDenied(true);
            setLocationGranted(false);
            setLiveLat(null);
            setLiveLng(null);
          }
        } finally {
          if (!cancelled && mountedRef.current) {
            setPermissionResolved(true);
          }
        }
      })();

      return () => {
        cancelled = true;
        mountedRef.current = false;
      };
    }, [hasServerPin])
  );

  const region: MapRegion = useMemo(() => {
    const lat = slat ?? liveLat ?? DEFAULT_MAP_REGION.latitude;
    const lng = slng ?? liveLng ?? DEFAULT_MAP_REGION.longitude;
    return sanitizeRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: DELTA,
      longitudeDelta: DELTA
    });
  }, [slat, slng, liveLat, liveLng]);

  const acc =
    typeof accuracyMeters === "number" && Number.isFinite(accuracyMeters)
      ? Math.min(Math.max(accuracyMeters, 12), 180)
      : 55;

  const mapWidth = Math.max(screenWidth - space.lg * 2, 280);
  const canShowMap = (permissionResolved || hasServerPin) && (hasServerPin || (locationGranted && liveLat != null && liveLng != null));

  if (Platform.OS === "web") {
    return (
      <View style={styles.fallback}>
        <Ionicons name="map-outline" size={36} color={colors.muted} />
        <Text style={styles.fallbackTitle}>Map on your phone</Text>
        <Text style={styles.fallbackBody}>Open this screen in the Android or iOS app for the live map.</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapShell}>
      {canShowMap ? (
        <MapErrorBoundary height={MAP_HEIGHT} screenName="TrackingLocationMap">
          <FieldMapView
            screenName="TrackingLocationMap"
            height={MAP_HEIGHT}
            width={mapWidth}
            region={region}
            loading={!permissionResolved && !hasServerPin}
            permissionResolved={permissionResolved || hasServerPin}
            locationDenied={locDenied && !hasServerPin}
            locationGranted={locationGranted || hasServerPin}
            showsUserLocation={locationGranted && liveLat != null}
            followsUserLocation={false}
            emptyMessage="Map could not load. Please enable GPS and try again."
            accuracyCircle={
              hasServerPin
                ? {
                    center: { latitude: slat!, longitude: slng! },
                    radiusMeters: acc
                  }
                : undefined
            }
            markers={
              hasServerPin
                ? [
                    {
                      id: "last-checkin",
                      lat: slat!,
                      lng: slng!,
                      title: "Last check-in",
                      description: "Saved for your team"
                    }
                  ]
                : []
            }
          />
        </MapErrorBoundary>
      ) : (
        <View style={styles.inlineFallback}>
          {!permissionResolved ? (
            <Text style={styles.inlineFallbackText}>Loading map…</Text>
          ) : (
            <>
              <Ionicons name="location-outline" size={28} color={colors.muted} />
              <Text style={styles.inlineFallbackText}>Map could not load. Please enable GPS and try again.</Text>
            </>
          )}
        </View>
      )}
      <View style={styles.mapBadge}>
        <Ionicons name="navigate" size={14} color={colors.primaryDark} />
        <Text style={styles.mapBadgeText}>
          {isActive && locationGranted && liveLat != null ? "Live · following you" : "Your map"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapShell: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: MAP_HEIGHT,
    minHeight: 220,
    overflow: "hidden",
    backgroundColor: colors.card
  },
  inlineFallback: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 220,
    padding: 20
  },
  inlineFallbackText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  mapBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border
  },
  mapBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800"
  },
  fallback: {
    minHeight: MAP_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
    gap: space.sm
  },
  fallbackTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center"
  },
  fallbackBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  }
});
