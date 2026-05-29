import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import { useOfflineSync } from "../../storage/OfflineSyncContext";
import { useTheme } from "../../theme";

type Props = {
  onPress?: () => void;
};

export function SyncStatusBadge({ onPress }: Props) {
  const { pendingCount, syncing } = useOfflineSync();
  const { theme } = useTheme();
  const c = theme.colors;

  if (!pendingCount && !syncing) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.badge, { backgroundColor: syncing ? c.warningSoft : c.accentSoft }]}
    >
      <Ionicons name={syncing ? "sync" : "cloud-upload-outline"} size={14} color={syncing ? c.warning : c.accent} />
      <Text style={[styles.text, { color: syncing ? c.warning : c.primaryDark }]}>
        {syncing ? "Syncing…" : `${pendingCount} pending`}
      </Text>
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
