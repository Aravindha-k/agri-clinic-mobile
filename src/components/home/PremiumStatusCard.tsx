import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusChip } from "../ui/StatusChip";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { useConnectivityOnline } from "../../hooks/useConnectivityOnline";

type Props = {
  workdayActive: boolean;
  gpsActive: boolean;
  visitPending: number;
  routePending: number;
  onSyncPress?: () => void;
};

export function PremiumStatusCard({
  workdayActive,
  gpsActive,
  visitPending,
  routePending,
  onSyncPress
}: Props) {
  const { colors, type, shadows } = useDesignSystem();
  const online = useConnectivityOnline();
  const totalPending = visitPending + routePending;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.elevated]}>
      <Text style={type.label}>Field status</Text>
      <View style={styles.chips}>
        <StatusChip variant={workdayActive ? "working" : "offline"} label={workdayActive ? "Workday on" : "Workday off"} />
        <StatusChip variant={gpsActive ? "online" : "warning"} label={gpsActive ? "GPS on" : "GPS needed"} />
        <StatusChip variant={online ? "online" : "offline"} />
        <StatusChip
          variant={totalPending > 0 ? "pending" : "synced"}
          label={totalPending > 0 ? `${totalPending} pending` : "Synced"}
        />
      </View>
      {totalPending > 0 && onSyncPress ? (
        <Pressable onPress={onSyncPress} style={[styles.syncRow, { backgroundColor: colors.cardMuted }]}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
          <Text style={[type.bodyStrong, { color: colors.text, flex: 1 }]}>Review sync queue</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginHorizontal: 16,
    padding: 16
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  syncRow: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  }
});
