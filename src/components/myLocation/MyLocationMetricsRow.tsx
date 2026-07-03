import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { formatShortTime } from "../../../mobile/lib/format";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from "../../../mobile/lib/theme";

type Props = {
  startedAt: string | null;
  distanceKm: string;
  lastSyncTime: string | null;
  accuracyMeters: number | null;
  syncing: boolean;
};

function MetricCard({
  icon,
  label,
  value,
  valueColor
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.card}>
      <Ionicons color={Colors.brand700} name={icon} size={18} />
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export const MyLocationMetricsRow = memo(function MyLocationMetricsRow({
  startedAt,
  distanceKm,
  lastSyncTime,
  accuracyMeters,
  syncing
}: Props) {
  const { t } = useI18n();

  const syncValue = syncing
    ? t("myLocation.syncing")
    : lastSyncTime
      ? formatRelativeTime(lastSyncTime)
      : t("myLocation.notYet");

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      <MetricCard
        icon="time-outline"
        label={t("myLocation.workingSince")}
        value={startedAt ? formatShortTime(startedAt) : "—"}
      />
      <MetricCard
        icon="git-branch-outline"
        label={t("myLocation.todaysDistance")}
        value={`${distanceKm} km`}
      />
      <MetricCard
        icon="sync-outline"
        label={t("myLocation.lastSync")}
        value={syncValue}
        valueColor={syncing ? Colors.amberText : Colors.greenText}
      />
      <MetricCard
        icon="locate-outline"
        label={t("myLocation.gpsAccuracy")}
        value={accuracyMeters != null ? `${Math.round(accuracyMeters)} m` : "—"}
      />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0
  },
  row: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm
  },
  card: {
    backgroundColor: Colors.brand50,
    borderColor: "rgba(15, 81, 50, 0.07)",
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    minWidth: 118,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadow.card
  },
  cardLabel: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium
  },
  cardValue: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  }
});
