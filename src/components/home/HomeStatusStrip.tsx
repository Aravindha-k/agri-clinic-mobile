import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useGpsCompliance } from "../../storage/GpsComplianceContext";
import { useOfflineSync } from "../../storage/OfflineSyncContext";
import { useTracking } from "../../storage/TrackingContext";
import { useTheme } from "../../theme";

type Props = {
  onPendingPress?: () => void;
};

export function HomeStatusStrip({ onPendingPress }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { isActive, pendingSyncCount: routePendingCount } = useTracking();
  const { status: gpsStatus } = useGpsCompliance();
  const { pendingCount: visitPendingCount } = useOfflineSync();

  const workdayLabel = isActive ? "Workday on" : "Workday off";
  const workdayColor = isActive ? c.success : c.muted;
  const gpsLabel =
    gpsStatus === "active" ? "GPS on" : gpsStatus === "blocked" ? "GPS blocked" : "GPS needed";
  const gpsColor =
    gpsStatus === "active" ? c.success : gpsStatus === "blocked" ? c.warning : c.primary;

  return (
    <View style={[styles.strip, { backgroundColor: c.card, borderColor: c.borderSubtle }]}>
      <View style={styles.item}>
        <Ionicons name={isActive ? "radio-button-on" : "radio-button-off"} size={14} color={workdayColor} />
        <Text style={[styles.text, { color: c.textSecondary }]}>{workdayLabel}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: c.borderSubtle }]} />
      <View style={styles.item}>
        <Ionicons name="locate" size={14} color={gpsColor} />
        <Text style={[styles.text, { color: c.textSecondary }]}>{gpsLabel}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: c.borderSubtle }]} />
      <Pressable
        accessibilityRole="button"
        onPress={onPendingPress}
        style={styles.item}
        disabled={!onPendingPress}
      >
        <Ionicons
          name="cloud-upload-outline"
          size={14}
          color={visitPendingCount > 0 || routePendingCount > 0 ? c.warning : c.muted}
        />
        <Text
          style={[
            styles.text,
            { color: visitPendingCount > 0 || routePendingCount > 0 ? c.text : c.textSecondary }
          ]}
        >
          {visitPendingCount > 0
            ? `${visitPendingCount} visit${visitPendingCount === 1 ? "" : "s"}`
            : routePendingCount > 0
              ? `${routePendingCount} GPS`
              : "Synced"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  item: { alignItems: "center", flex: 1, flexDirection: "row", gap: 6, justifyContent: "center" },
  divider: { height: 18, width: StyleSheet.hairlineWidth },
  text: { fontSize: 12, fontWeight: "700" }
});
