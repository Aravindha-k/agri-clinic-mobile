import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { formatShortTime } from "../../../mobile/lib/format";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../../mobile/lib/theme";
import type { MyLocationStatusTone } from "../../hooks/useMyLocationScreen";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

type Props = {
  tone: MyLocationStatusTone;
  trackingStatusKey: "active" | "inactive" | "gpsOff" | "syncPending";
  startedAt: string | null;
  distanceKm: string;
  lastSyncTime: string | null;
  accuracyMeters: number | null;
  online: boolean;
  backgroundTracking: boolean;
  pendingVisits: number;
  pendingGps: number;
};

function toneColors(tone: MyLocationStatusTone) {
  switch (tone) {
    case "red":
      return { dot: Colors.red, bg: Colors.redBg, border: Colors.red };
    case "amber":
      return { dot: Colors.amber, bg: Colors.amberBg, border: Colors.amber };
    default:
      return { dot: Colors.green, bg: Colors.greenBg, border: Colors.green };
  }
}

export const MyLocationStatusCard = memo(function MyLocationStatusCard({
  tone,
  trackingStatusKey,
  startedAt,
  distanceKm,
  lastSyncTime,
  accuracyMeters,
  online,
  backgroundTracking,
  pendingVisits,
  pendingGps
}: Props) {
  const { t } = useI18n();
  const palette = toneColors(tone);
  const statusLabel = t(`myLocation.status.${trackingStatusKey}`);

  return (
    <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: palette.dot }]} />
        <View style={styles.statusCopy}>
          <Text style={styles.eyebrow}>{t("myLocation.trackingStatus")}</Text>
          <Text style={styles.statusTitle}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Metric label={t("myLocation.workingSince")} value={startedAt ? formatShortTime(startedAt) : "—"} />
        <Metric label={t("myLocation.todaysDistance")} value={`${distanceKm} km`} />
        <Metric
          label={t("myLocation.lastSync")}
          value={lastSyncTime ? formatRelativeTime(lastSyncTime) : t("myLocation.notYet")}
        />
        <Metric
          label={t("myLocation.gpsAccuracy")}
          value={accuracyMeters != null ? `${Math.round(accuracyMeters)} m` : "—"}
        />
        <Metric
          label={t("myLocation.internet")}
          value={online ? t("myLocation.connected") : t("myLocation.offline")}
        />
        <Metric
          label={t("myLocation.backgroundTracking")}
          value={backgroundTracking ? t("myLocation.running") : t("myLocation.paused")}
        />
        <Metric label={t("myLocation.pendingVisits")} value={String(pendingVisits)} />
        <Metric label={t("myLocation.pendingGps")} value={String(pendingGps)} />
      </View>
    </View>
  );
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm
  },
  dot: {
    borderRadius: 6,
    height: 12,
    width: 12
  },
  statusCopy: {
    flex: 1,
    minWidth: 0
  },
  eyebrow: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  statusTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: 2
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm
  },
  metric: {
    minWidth: "46%",
    width: "46%"
  },
  metricLabel: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium
  },
  metricValue: {
    color: Colors.text1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    marginTop: 2
  }
});
