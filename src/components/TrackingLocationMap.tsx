import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Region } from "react-native-maps";
import { FieldMapView } from "./map/FieldMapView";
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
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLng, setLiveLng] = useState<number | null>(null);
  const [permissionResolved, setPermissionResolved] = useState(false);
  const [locDenied, setLocDenied] = useState(false);

  const slat = hasValidMapCoords(serverLatitude, serverLongitude) ? parseMapCoord(serverLatitude) : null;
  const slng = hasValidMapCoords(serverLatitude, serverLongitude) ? parseMapCoord(serverLongitude) : null;
  const hasServerPin = slat != null && slng != null;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPermissionResolved(false);
      setLocDenied(false);

      void (async () => {
        try {
          const r = await getForegroundLocation();
          if (cancelled) return;

          if (!r.granted) {
            setLocDenied(true);
            setLiveLat(null);
            setLiveLng(null);
          } else {
            const lat = r.location.coords.latitude;
            const lng = r.location.coords.longitude;
            if (hasValidMapCoords(lat, lng)) {
              setLiveLat(lat);
              setLiveLng(lng);
              setLocDenied(false);
            } else {
              setLocDenied(true);
              setLiveLat(null);
              setLiveLng(null);
            }
          }
        } catch {
          if (!cancelled) {
            setLocDenied(true);
            setLiveLat(null);
            setLiveLng(null);
          }
        } finally {
          if (!cancelled) {
            setPermissionResolved(true);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const region: Region = useMemo(() => {
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
      <FieldMapView
        height={MAP_HEIGHT}
        width={mapWidth}
        region={region}
        loading={!permissionResolved && !hasServerPin}
        permissionResolved={permissionResolved || hasServerPin}
        locationDenied={locDenied && !hasServerPin}
        showsUserLocation={!locDenied && (liveLat != null || isActive)}
        followsUserLocation={isActive && !locDenied && liveLat != null}
        emptyMessage="Location not available. Please enable GPS and try again."
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
                  description: "Saved for your team",
                  pinColor: colors.primaryDark
                }
              ]
            : []
        }
      />
      <View style={styles.mapBadge}>
        <Ionicons name="navigate" size={14} color={colors.primaryDark} />
        <Text style={styles.mapBadgeText}>
          {isActive && !locDenied && liveLat != null ? "Live · following you" : "Your map"}
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
    overflow: "hidden",
    backgroundColor: colors.card
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
