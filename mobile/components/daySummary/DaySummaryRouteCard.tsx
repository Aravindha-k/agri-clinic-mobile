import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { FieldMapView } from "../../../src/components/map/FieldMapView";
import { useI18n } from "../../../src/i18n/I18nContext";
import { readPendingGpsBuffer } from "../../../mobile/lib/gps/trackingService";
import { readPendingVisits } from "../../lib/pendingVisitsQueue";
import {
  buildDayMarkerFitCoords,
  buildDayRouteMarkers,
  extractWorkdayStartPoint
} from "../../../src/utils/dayRouteMap";
import { logDayTabError } from "../../../src/utils/dayTabDiagnostics";
import { isSameVisitLocalDay } from "../../../src/utils/format";
import { fitMapRegion } from "../../../src/utils/mapRegion";
import { visitRowFromApi, type VisitMapPoint } from "../../../src/utils/visitMapFlow";
import { fetchVisitsForMapMarkers } from "../../../src/utils/visitsCache";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { SectionHeader } from "../ui/SectionHeader";

const MAP_HEIGHT = 132;
const VISITS_REFRESH_MS = 60_000;

type Props = {
  title: string;
  distanceLabel: string;
  distanceValue: string;
  workdayId?: number;
  dutySessionId?: number;
  serverStart?: {
    latitude?: string | number | null;
    longitude?: string | number | null;
  } | null;
  /** Bumps when parent tracking sync completes — triggers reload. */
  refreshToken?: string | null;
  onPress: () => void;
};

export function DaySummaryRouteCard({
  title,
  distanceLabel,
  distanceValue,
  workdayId,
  dutySessionId,
  serverStart,
  refreshToken,
  onPress
}: Props) {
  const { t } = useI18n();
  const mountedRef = useRef(true);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [loading, setLoading] = useState(Boolean(workdayId));
  const [visitsToday, setVisitsToday] = useState<VisitMapPoint[]>([]);
  const [pendingTrackTick, setPendingTrackTick] = useState(0);

  const pendingPoints = useMemo(() => {
    void pendingTrackTick;
    if (!workdayId) return [];
    return readPendingGpsBuffer();
  }, [pendingTrackTick, workdayId]);

  const startPoint = useMemo(
    () =>
      workdayId
        ? extractWorkdayStartPoint({
            serverStart,
            pendingPoints,
            workdayId,
            dutySessionId
          })
        : null,
    [dutySessionId, pendingPoints, serverStart, workdayId]
  );

  const fitCoordinates = useMemo(
    () =>
      buildDayMarkerFitCoords({
        startPoint,
        visits: visitsToday
      }),
    [startPoint, visitsToday]
  );

  const markers = useMemo(
    () =>
      buildDayRouteMarkers({
        startPoint,
        visits: visitsToday,
        startLabel: t("myLocation.legendRouteStart"),
        startDescription: t("myLocation.workStartHint")
      }),
    [startPoint, t, visitsToday]
  );

  const mapRegion = useMemo(() => {
    if (fitCoordinates.length === 0) return undefined;
    return fitMapRegion(fitCoordinates.map((p) => ({ lat: p.latitude, lng: p.longitude })));
  }, [fitCoordinates]);

  const loadDayRoute = useCallback(async () => {
    if (!workdayId) {
      setVisitsToday([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [freshVisits, pendingVisits] = await Promise.all([
        fetchVisitsForMapMarkers({ pageSize: 100, maxPages: 10, dateFilter: "today" }),
        readPendingVisits().catch(() => [])
      ]);
      if (!mountedRef.current) return;

      const today = new Date();
      const rows = freshVisits
        .filter((v) => isSameVisitLocalDay(v, today))
        .map(visitRowFromApi)
        .filter((row): row is VisitMapPoint => row != null);
      const queuedRows = pendingVisits
        .filter((row) => isSameVisitLocalDay({ created_at: row.createdAt }, today))
        .map((row) =>
          visitRowFromApi({
            id: row.local_sync_id,
            latitude: row.values.latitude,
            longitude: row.values.longitude,
            farmer_name: row.values.farmer_name,
            village_name: row.values.village,
            visit_date: row.values.visit_date,
            created_at: row.createdAt
          })
        )
        .filter((row): row is VisitMapPoint => row != null);

      setVisitsToday([...rows, ...queuedRows]);
      setPendingTrackTick((tick) => tick + 1);
    } catch (err) {
      logDayTabError("day_route_visits", err);
      if (mountedRef.current) {
        setVisitsToday([]);
      }
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
    void loadDayRoute();
  }, [loadDayRoute, refreshToken]);

  useFocusEffect(
    useCallback(() => {
      void loadDayRoute();
    }, [loadDayRoute])
  );

  useEffect(() => {
    if (!workdayId) return;
    const timer = setInterval(() => void loadDayRoute(), VISITS_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadDayRoute, workdayId]);

  const hasMapContent = fitCoordinates.length > 0;
  const showMap = !loading && hasMapContent && mapRegion && previewWidth > 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerPad}>
        <SectionHeader title={title} />
      </View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${t("myLocation.openFullMap")}`}
        style={({ pressed }) => [pressed && { opacity: 0.96 }]}
      >
          <FlatCard variant="secondary" style={styles.card}>
          <View
            style={styles.previewWrap}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              if (w > 0) setPreviewWidth(w);
            }}
          >
            {loading ? (
              <View style={styles.previewBody}>
                <ActivityIndicator color={Colors.brand700} />
              </View>
            ) : showMap ? (
              <FieldMapView
                screenName="DaySummaryRouteCard"
                height={MAP_HEIGHT}
                width={previewWidth}
                region={mapRegion}
                markers={markers}
                fitCoordinates={fitCoordinates}
                fitEdgePadding={{ top: 28, right: 28, bottom: 28, left: 28 }}
                showsUserLocation={false}
                locationGranted={false}
                followsUserLocation={false}
                permissionResolved
                loading={false}
                interactive={false}
                compactMarkers
              />
            ) : (
              <View style={styles.previewBody}>
                <Ionicons name="map-outline" size={28} color={Colors.text4} />
                <Text style={styles.previewHint}>
                  {workdayId ? t("myLocation.noRouteMapHint") : t("myLocation.empty.noWorkday")}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.distanceRow}>
            <View style={styles.distanceCopy}>
              <Text style={styles.distanceValue}>{distanceValue}</Text>
              <Text style={styles.distanceLabel}>{distanceLabel}</Text>
            </View>
            <View style={styles.openHint}>
              <Text style={styles.openHintText}>{t("myLocation.openFullMap")}</Text>
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
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: MAP_HEIGHT,
    overflow: "hidden",
    width: "100%"
  },
  previewBody: {
    alignItems: "center",
    flex: 1,
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg
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
