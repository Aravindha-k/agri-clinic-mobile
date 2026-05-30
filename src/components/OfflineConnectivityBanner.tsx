import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useConnectivityOnline } from "../hooks/useConnectivityOnline";
import { useTheme } from "../theme";

type Props = {
  onPressSync?: () => void;
};

/** Shown when API reports no connectivity. */
export function OfflineConnectivityBanner({ onPressSync }: Props) {
  const online = useConnectivityOnline();
  const { theme } = useTheme();
  const c = theme.colors;

  if (online) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPressSync}
      style={[styles.wrap, { backgroundColor: c.warningSoft, borderColor: c.warning }]}
    >
      <Ionicons name="cloud-offline-outline" size={18} color={c.warning} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: c.text }]}>You are offline</Text>
        <Text style={[styles.sub, { color: c.muted }]}>
          Visits and data will sync when connection returns. Tap to open sync queue.
        </Text>
      </View>
      {onPressSync ? <Ionicons name="chevron-forward" size={18} color={c.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12
  },
  copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: "800" },
  sub: { fontSize: 12, lineHeight: 17, marginTop: 2 }
});
