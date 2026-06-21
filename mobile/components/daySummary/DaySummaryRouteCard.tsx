import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL, buildApiUrl } from "../../../src/api/config";
import { getAllWorkdayLocations } from "../../../src/api/tracking";
import { logDayTabApi, logDayTabError } from "../../../src/utils/dayTabDiagnostics";
import { subscribeRouteSync } from "../../../src/utils/routeSyncBus";
import { hasValidMapCoords, parseMapCoord } from "../../../src/utils/mapCoords";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { SectionHeader } from "../ui/SectionHeader";

const MAP_HEIGHT = 132;
const ROUTE_AUTO_REFRESH_MS = 45_000;

type Props = {
  title: string;
  distanceLabel: string;
  distanceValue: string;
  workdayId?: number;
  /** Bumps when parent tracking sync completes — triggers reload. */
  refreshToken?: string | null;
  onPress: () => void;
};

/** Static route preview — no MapView (MapView inside ScrollView crashes on Android). */
export function DaySummaryRouteCard({
  title,
  distanceLabel,
  distanceValue,
  workdayId,
  refreshToken,
  onPress
}: Props) {
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(Boolean(workdayId));
  const [routePoints, setRoutePoints] = useState(0);

  const loadRoute = useCallback(async () => {
    if (!workdayId) {
      setRoutePoints(0);
      setLoading(false);
      return;
    }
    const url = buildApiUrl(
      `tracking/workday/${workdayId}/locations/?page=1&page_size=200`,
      API_BASE_URL
    );
    setLoading(true);
    try {
      const logs = await getAllWorkdayLocations(workdayId);
      if (!mountedRef.current) return;
      const count = logs.filter((p) => {
        const lat = parseMapCoord(p.latitude);
        const lng = parseMapCoord(p.longitude);
        return lat != null && lng != null && hasValidMapCoords(lat, lng);
      }).length;
      setRoutePoints(count);
      logDayTabApi("route", url, true, `points=${count}`);
    } catch (err) {
      logDayTabApi("route", url, false, err instanceof Error ? err.message : String(err));
      logDayTabError("route_load", err);
      if (mountedRef.current) setRoutePoints(0);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [workdayId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void loadRoute();
  }, [loadRoute, refreshToken]);

  useFocusEffect(
    useCallback(() => {
      void loadRoute();
    }, [loadRoute])
  );

  useEffect(() => {
    return subscribeRouteSync(() => {
      void loadRoute();
    });
  }, [loadRoute]);

  useEffect(() => {
    if (!workdayId) return;
    const timer = setInterval(() => {
      void loadRoute();
    }, ROUTE_AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadRoute, workdayId]);

  return (
    <View style={styles.section}>
      <View style={styles.headerPad}>
        <SectionHeader title={title} />
      </View>
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.96 }]}>
        <FlatCard style={styles.card}>
          <View style={styles.previewWrap}>
            {loading ? (
              <View style={styles.previewBody}>
                <ActivityIndicator color={Colors.brand700} />
              </View>
            ) : routePoints > 0 ? (
              <View style={styles.previewBody}>
                <View style={styles.previewIconWrap}>
                  <Ionicons name="navigate" size={28} color={Colors.brand700} />
                </View>
                <Text style={styles.previewTitle}>
                  {routePoints} GPS point{routePoints === 1 ? "" : "s"} recorded
                </Text>
                <Text style={styles.previewHint}>Tap to open full route map</Text>
              </View>
            ) : (
              <View style={styles.previewBody}>
                <Ionicons name="map-outline" size={28} color={Colors.text4} />
                <Text style={styles.previewHint}>Route updates automatically while you work</Text>
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
  previewWrap: {
    backgroundColor: Colors.bg,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: MAP_HEIGHT,
    overflow: "hidden"
  },
  previewBody: {
    alignItems: "center",
    flex: 1,
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg
  },
  previewIconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.pill,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  previewTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  },
  previewHint: {
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
