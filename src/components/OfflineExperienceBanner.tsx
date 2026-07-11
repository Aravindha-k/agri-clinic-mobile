import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useConnectivityOnline } from "../hooks/useConnectivityOnline";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { useSyncStore } from "../../mobile/lib/store/syncStore";
import { getFieldPendingCounts } from "../../mobile/lib/sync/pendingCounts";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { StatusChip } from "./ui/StatusChip";

type Props = {
  onPressStatus?: () => void;
  compact?: boolean;
};

/** Passive offline/sync status — no manual sync action for field officers. */
export function OfflineExperienceBanner({ onPressStatus, compact }: Props) {
  const online = useConnectivityOnline();
  const { colors, type } = useDesignSystem();
  const syncing = useSyncStore((s) => s.isSyncing);
  const syncHealth = useSyncStore((s) => s.syncHealth);
  const lastSyncAt = useSyncStore((s) => s.lastSyncedAt);
  const counts = getFieldPendingCounts();
  const pendingTotal = counts.total;

  const show = !online || pendingTotal > 0 || syncing || syncHealth !== "synced";
  if (!show) return null;

  const statusLine = (() => {
    if (syncHealth === "auth_required") return "Authentication required to resume sync";
    if (syncHealth === "attention_required") return "Some field data needs attention";
    if (!online && pendingTotal > 0) return "Saving offline — sync will start automatically when internet returns";
    if (syncing) return "Syncing field data…";
    if (!online) return "You're offline — field data is saved on this device";
    if (pendingTotal > 0) return `${pendingTotal} item${pendingTotal === 1 ? "" : "s"} syncing automatically`;
    return "All field data is synced";
  })();

  const syncLine = lastSyncAt ? `Last synced ${formatRelativeTime(lastSyncAt)}` : null;

  return (
    <Pressable
      onPress={onPressStatus}
      disabled={!onPressStatus}
      style={[
        styles.wrap,
        {
          backgroundColor: online ? colors.card : colors.warningSoft,
          borderColor: online ? colors.borderSubtle : colors.warning
        }
      ]}
    >
      <View style={styles.topRow}>
        <StatusChip variant={online ? "pending" : "offline"} compact />
        <View style={styles.copy}>
          <Text style={[type.bodyStrong, { color: colors.text }]}>{statusLine}</Text>
          {!compact && syncLine ? (
            <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{syncLine}</Text>
          ) : null}
        </View>
        {onPressStatus ? (
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12
  },
  topRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  copy: { flex: 1, gap: 2 }
});
