import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { getAllWorkdayLocations } from "../../../src/api/tracking";
import { FieldMapView } from "../../../src/components/map/FieldMapView";
import { MapErrorBoundary } from "../../../src/components/map/MapErrorBoundary";
import { hasValidMapCoords, parseMapCoord } from "../../../src/utils/mapCoords";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../../../src/utils/mapRegion";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { SectionHeader } from "../ui/SectionHeader";

const MAP_HEIGHT = 132;

type Props = {
  title: string;
  distanceLabel: string;
  distanceValue: string;
  workdayId?: number;
  onPress: () => void;
};

export function DaySummaryRouteCard({
  title,
  distanceLabel,
  distanceValue,
  workdayId,
  onPress
}: Props) {
  const { width } = useWindowDimensions();
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(Boolean(workdayId));
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);

  const loadRoute = useCallback(async () => {
    if (!workdayId) {
      setRoute([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const logs = await getAllWorkdayLocations(workdayId);
      if (!mountedRef.current) return;
      const coords = logs
        .map((p) => {
          const lat = parseMapCoord(p.latitude);
          const lng = parseMapCoord(p.longitude);
          if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
          return { latitude: lat, longitude: lng };
        })
        .filter(Boolean) as { latitude: number; longitude: number }[];
      setRoute(coords);
    } catch {
      if (mountedRef.current) setRoute([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [workdayId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadRoute();
    return () => {
      mountedRef.current = false;
    };
  }, [loadRoute]);

  const region = useMemo(
    () =>
      route.length
        ? fitMapRegion(route.map((p) => ({ lat: p.latitude, lng: p.longitude })))
        : DEFAULT_MAP_REGION,
    [route]
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerPad}>
        <SectionHeader title={title} />
      </View>
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.96 }]}>
        <FlatCard style={styles.card}>
          <View style={[styles.mapWrap, { width: width - Spacing.lg * 2 - 2 }]}>
            {loading ? (
              <View style={styles.mapFallback}>
                <ActivityIndicator color={Colors.brand700} />
              </View>
            ) : route.length > 0 ? (
              <MapErrorBoundary height={MAP_HEIGHT} screenName="DaySummaryRoute">
                <FieldMapView
                  screenName="DaySummaryRoute"
                  height={MAP_HEIGHT}
                  width={width - Spacing.lg * 2 - 2}
                  region={region}
                  route={route}
                  showsUserLocation={false}
                  followsUserLocation={false}
                  permissionResolved
                  locationGranted
                  emptyMessage=""
                />
              </MapErrorBoundary>
            ) : (
              <View style={styles.mapFallback}>
                <Ionicons name="map-outline" size={28} color={Colors.text4} />
                <Text style={styles.mapFallbackText}>Route appears after GPS points sync</Text>
              </View>
            )}
          </View>

          <View style={styles.distanceRow}>
            <View style={styles.distanceCopy}>
              <Text style={styles.distanceValue}>{distanceValue}</Text>
              <Text style={styles.distanceLabel}>{distanceLabel}</Text>
            </View>
            <View style={styles.openHint}>
              <Text style={styles.openHintText}>View route</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.brand700} />
            </View>
          </View>
        </FlatCard>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
    marginTop: Spacing.lg
  },
  headerPad: {
    paddingHorizontal: Spacing.lg
  },
  card: {
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    overflow: "hidden",
    padding: 0
  },
  mapWrap: {
    backgroundColor: Colors.bg,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: MAP_HEIGHT,
    overflow: "hidden"
  },
  map: {
    flex: 1
  },
  mapFallback: {
    alignItems: "center",
    flex: 1,
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg
  },
  mapFallbackText: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    textAlign: "center"
  },
  distanceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md
  },
  distanceCopy: {
    gap: 2
  },
  distanceValue: {
    color: Colors.text1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold
  },
  distanceLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  openHint: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2
  },
  openHintText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  }
});
