import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { formatShortTime } from "../../../mobile/lib/format";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from "../../../mobile/lib/theme";
import { MyLocationSyncChip } from "./MyLocationSyncChip";

type Props = {
  isLive: boolean;
  distanceKm: string;
  startedAt: string | null;
  accuracyMeters: number | null;
  syncing: boolean;
  hasPending: boolean;
};

export const MyLocationLiveBar = memo(function MyLocationLiveBar({
  isLive,
  distanceKm,
  startedAt,
  accuracyMeters,
  syncing,
  hasPending
}: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <View style={[styles.liveDot, isLive ? styles.liveDotOn : styles.liveDotOff]} />
        <View style={styles.copy}>
          <Text style={styles.title}>
            {isLive ? t("myLocation.liveTracking") : t("myLocation.notTracking")}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {distanceKm} km
            {startedAt ? ` · ${formatShortTime(startedAt)}` : ""}
            {accuracyMeters != null ? ` · ±${Math.round(accuracyMeters)} m` : ""}
          </Text>
        </View>
      </View>
      <MyLocationSyncChip syncing={syncing} hasPending={hasPending} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    left: Spacing.lg,
    position: "absolute",
    right: Spacing.lg,
    zIndex: 3
  },
  bar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: Radius.card,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadow.card
  },
  liveDot: {
    borderRadius: 6,
    height: 12,
    width: 12
  },
  liveDotOn: {
    backgroundColor: Colors.green
  },
  liveDotOff: {
    backgroundColor: Colors.text4
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  meta: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2
  }
});
