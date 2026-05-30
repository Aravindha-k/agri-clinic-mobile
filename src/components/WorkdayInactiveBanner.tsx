import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTracking } from "../storage/TrackingContext";
import { useTheme } from "../theme";
import { space } from "../theme/layout";

export function WorkdayInactiveBanner() {
  const { workdayInactiveBanner, busy, startDay } = useTracking();
  const { theme } = useTheme();
  const c = theme.colors;

  if (!workdayInactiveBanner) {
    return null;
  }

  return (
    <View style={[styles.wrap, { backgroundColor: c.warningSoft, borderColor: c.warning }]}>
      <Ionicons name="time-outline" size={20} color={c.warning} />
      <Text style={[styles.text, { color: c.text }]}>{workdayInactiveBanner}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          void startDay().catch(() => undefined);
        }}
        style={[styles.btn, { backgroundColor: c.primary }]}
      >
        <Text style={styles.btnText}>Start day</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    padding: 12
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    minWidth: 160
  },
  btn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  }
});
