import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LAN_OFFLINE_BANNER_MESSAGE } from "../../lib/api";
import { Colors, FontSize, FontWeight, Radius } from "../../lib/theme";

type Props = {
  pendingCount: number;
  lastSyncedAt: Date | null;
  onSync: () => void;
  offline?: boolean;
  /** Office LAN API unreachable — show amber offline-mode copy instead of a red error. */
  lanOnly?: boolean;
};

function formatLastSync(date: Date | null): string {
  if (!date) return "never";
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function OfflineBanner({
  pendingCount,
  lastSyncedAt,
  onSync,
  offline = false,
  lanOnly = false
}: Props) {
  if (pendingCount <= 0 && !offline && !lanOnly) {
    return null;
  }

  const pendingLine = lanOnly
    ? LAN_OFFLINE_BANNER_MESSAGE
    : pendingCount > 0
      ? `${pendingCount} visit${pendingCount === 1 ? "" : "s"} pending`
      : "Offline";

  return (
    <View style={[styles.wrap, { backgroundColor: Colors.amberBg, borderRadius: Radius.lg }]}>
      <Ionicons name="cloud-offline-outline" size={18} color={Colors.amber} />
      <Text style={[styles.copy, { color: Colors.amberText }]} numberOfLines={2}>
        {pendingLine} · Last sync {formatLastSync(lastSyncedAt)}
      </Text>
      <Pressable
        onPress={onSync}
        style={[styles.syncBtn, { backgroundColor: Colors.amber }]}
        accessibilityRole="button"
      >
        <Text style={[styles.syncLabel, { color: Colors.surface }]}>Sync</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  copy: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  syncBtn: {
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  syncLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  }
});
