/** @deprecated Not mounted in V2 — use requestGpsForFieldWork() on workday/visit actions instead. */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../mobile/lib/theme";
import { useSafeAreaInsetsCompat } from "../hooks/useSafeAreaInsetsCompat";
import { useGpsCompliance } from "../storage/GpsComplianceContext";

export function GpsComplianceBanner() {
  const { status, bannerTitle, bannerSubtitle, permissionDenied, showPermissionHelp } = useGpsCompliance();
  const insets = useSafeAreaInsetsCompat();

  if (status === "active") {
    return null;
  }

  const blocked = status === "blocked";
  const icon: keyof typeof Ionicons.glyphMap = blocked
    ? "close-circle"
    : permissionDenied
      ? "settings-outline"
      : "location-outline";

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) }]}>
      <Ionicons name={icon} size={18} color={blocked ? Colors.red : Colors.amber} />
      <View style={styles.textCol}>
        <Text style={styles.title}>{bannerTitle}</Text>
        <Text style={styles.sub}>{bannerSubtitle}</Text>
      </View>
      {permissionDenied && !blocked ? (
        <Pressable accessibilityRole="button" onPress={showPermissionHelp} style={styles.btn}>
          <Text style={styles.btnText}>Settings</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: Colors.amberBg,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    paddingBottom: 10,
    paddingHorizontal: 14
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { color: Colors.text1, fontSize: 13, fontWeight: "800" },
  sub: { color: Colors.text3, fontSize: 11, fontWeight: "600", lineHeight: 15, marginTop: 2 },
  btn: {
    borderColor: Colors.border2,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  btnText: { color: Colors.brand700, fontSize: 11, fontWeight: "800" }
});
