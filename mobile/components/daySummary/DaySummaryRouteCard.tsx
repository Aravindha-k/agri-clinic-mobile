import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { FieldMapView } from "../../../src/components/map/FieldMapView";
import {
  buildEmployeeDayFitCoordinates,
  buildEmployeeDayMapMarkers
} from "../../../src/features/duty/map/employeeDayMapMarkers";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../../../src/utils/mapRegion";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { SectionHeader } from "../ui/SectionHeader";

const MAP_HEIGHT = 132;

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
  onPress
}: Props) {
  const { t } = useI18n();
  const { currentDuty, dutyMap } = useDuty();
  const [previewWidth, setPreviewWidth] = useState(0);
  const loading = false;

  const workdayEnded = Boolean(
    currentDuty &&
      !currentDuty.is_active &&
      (Boolean(currentDuty.ended_at) || Boolean(currentDuty.end_time) || currentDuty.is_active === false)
  );

  const markers = useMemo(
    () =>
      buildEmployeeDayMapMarkers({
        dutyMap,
        workdayEnded,
        labels: {
          startTitle: t("myLocation.legendRouteStart"),
          startDescription: t("myLocation.workStartHint"),
          visitTitle: t("myLocation.legendVisit"),
          endTitle: t("myLocation.legendRouteEnd")
        }
      }),
    [dutyMap, t, workdayEnded]
  );

  const fitCoordinates = useMemo(
    () => buildEmployeeDayFitCoordinates(markers),
    [markers]
  );

  const mapRegion = useMemo(() => {
    if (fitCoordinates.length === 0) return DEFAULT_MAP_REGION;
    return fitMapRegion(fitCoordinates.map((p) => ({ lat: p.latitude, lng: p.longitude })));
  }, [fitCoordinates]);
  const showMap = !loading && previewWidth > 0;

  void workdayId;

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
                route={[]}
                fitCoordinates={fitCoordinates.length ? fitCoordinates : undefined}
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
