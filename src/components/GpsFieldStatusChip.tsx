import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useGpsCompliance } from "../storage/GpsComplianceContext";
import { useTheme } from "../theme";

/** Compact GPS compliance indicator (e.g. Home screen). */
export function GpsFieldStatusChip() {
  const { status } = useGpsCompliance();
  const { theme } = useTheme();
  const c = theme.colors;

  const active = status === "active";
  const blocked = status === "blocked";
  const color = active ? c.success : blocked ? c.danger : c.warning;
  const bg = active ? c.successSoft : blocked ? c.dangerSoft : c.warningSoft;
  const label = active ? "GPS Active" : blocked ? "GPS Blocked" : "GPS Required";
  const icon: keyof typeof Ionicons.glyphMap = active
    ? "location"
    : blocked
      ? "close-circle"
      : "location-outline";

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: color }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  text: { fontSize: 11, fontWeight: "800" }
});
