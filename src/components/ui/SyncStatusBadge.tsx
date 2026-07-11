import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSyncStore } from "../../../mobile/lib/store/syncStore";
import { getFieldPendingCounts } from "../../../mobile/lib/sync/pendingCounts";
import { useTheme } from "../../theme";

type Props = {
  onPress?: () => void;
};

export function SyncStatusBadge({ onPress }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const syncing = useSyncStore((s) => s.isSyncing);
  const syncHealth = useSyncStore((s) => s.syncHealth);
  const counts = getFieldPendingCounts();

  if (counts.total === 0 && !syncing && syncHealth === "synced") {
    return null;
  }

  const label = syncing
    ? "Syncing…"
    : syncHealth === "offline_saving"
      ? "Offline"
      : syncHealth === "auth_required"
        ? "Sign in"
        : `${counts.total} pending`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.badge, { backgroundColor: syncing ? c.warningSoft : c.accentSoft }]}
    >
      <Ionicons name={syncing ? "sync" : "cloud-upload-outline"} size={14} color={syncing ? c.warning : c.accent} />
      <Text style={[styles.text, { color: syncing ? c.warning : c.primaryDark }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  text: { fontSize: 12, fontWeight: "800" }
});
