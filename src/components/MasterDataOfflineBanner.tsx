import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMasterData } from "../storage/MasterDataContext";
import { useTheme } from "../theme";

type Props = {
  onPressSync?: () => void;
};

export function MasterDataOfflineBanner({ onPressSync }: Props) {
  const { offlineWarning, syncing, refreshMasterData } = useMasterData();
  const { theme } = useTheme();
  const c = theme.colors;

  if (!offlineWarning && !syncing) return null;

  const message = syncing ? "Syncing master data…" : offlineWarning;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (onPressSync) {
          onPressSync();
        } else {
          void refreshMasterData();
        }
      }}
      style={[styles.banner, { backgroundColor: c.warningSoft, borderColor: c.warning }]}
    >
      <Ionicons name={syncing ? "sync-outline" : "information-circle-outline"} size={18} color={c.warning} />
      <Text style={[styles.text, { color: c.text }]} numberOfLines={2}>
        {message}
      </Text>
      <Ionicons name="refresh" size={18} color={c.warning} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  text: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 }
});
