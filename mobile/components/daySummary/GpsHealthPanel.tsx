import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { StatusChip } from "../ui";
import { FlatCard } from "../layout/FlatCard";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

type Props = {
  gpsActive: boolean;
  lastSyncLabel: string;
  pendingPoints: number;
  batteryPercent: number | null;
  online: boolean;
  title?: string;
};

export function GpsHealthPanel({
  gpsActive,
  lastSyncLabel,
  pendingPoints,
  batteryPercent,
  online,
  title
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const panelTitle = title ?? t("daySummary.gpsHealth");

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.headerBtn}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerRow}>
          <Ionicons name="pulse-outline" size={16} color={Colors.text3} />
          <Text style={styles.headerTitle}>{panelTitle}</Text>
          <StatusChip
            label={gpsActive ? t("daySummary.gpsOn") : t("daySummary.gpsOff")}
            variant={gpsActive ? "green" : "gray"}
          />
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.text3} />
      </Pressable>

      {expanded ? (
        <FlatCard style={styles.panel}>
          <HealthRow label={t("daySummary.gpsActive")} value={gpsActive ? t("daySummary.yes") : t("daySummary.no")} />
          <HealthRow label={t("daySummary.lastSync")} value={lastSyncLabel} />
          <HealthRow label={t("daySummary.pendingGps")} value={String(pendingPoints)} />
          <HealthRow
            label={t("daySummary.battery")}
            value={batteryPercent != null ? `${batteryPercent}%` : "—"}
          />
          <HealthRow label={t("daySummary.network")} value={online ? t("daySummary.online") : t("daySummary.offline")} />

          {pendingPoints > 0 ? (
            <View style={styles.syncBlock}>
              <Text style={styles.autoSyncNote}>{t("daySummary.gpsAutoSync")}</Text>
            </View>
          ) : null}
        </FlatCard>
      ) : null}
    </View>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg
  },
  headerBtn: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 8
  },
  headerTitle: {
    color: Colors.text2,
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase"
  },
  panel: {
    gap: 10,
    padding: Spacing.md
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  rowLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  rowValue: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  syncBlock: {
    marginTop: 4
  },
  autoSyncNote: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 18
  }
});
