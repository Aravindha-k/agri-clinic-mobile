import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsetsCompat } from "../hooks/useSafeAreaInsetsCompat";
import { useGpsCompliance } from "../storage/GpsComplianceContext";
import { useTheme } from "../theme";

export function GpsComplianceBanner() {
  const { status, bannerTitle, bannerSubtitle, permissionDenied, showPermissionHelp } = useGpsCompliance();
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsetsCompat();

  if (status === "active") {
    return null;
  }

  const blocked = status === "blocked";
  const bg = blocked ? c.dangerSoft : c.warningSoft;
  const border = blocked ? c.danger : c.warning;
  const icon: keyof typeof Ionicons.glyphMap = blocked
    ? "close-circle"
    : permissionDenied
      ? "settings-outline"
      : "location-outline";

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: Math.max(insets.top, 8),
          backgroundColor: bg,
          borderBottomColor: border
        }
      ]}
    >
      <Ionicons name={icon} size={20} color={border} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: c.text }]}>{bannerTitle}</Text>
        <Text style={[styles.sub, { color: c.muted }]}>{bannerSubtitle}</Text>
      </View>
      {permissionDenied && !blocked ? (
        <Pressable
          accessibilityRole="button"
          onPress={showPermissionHelp}
          style={[styles.btn, { borderColor: border }]}
        >
          <Text style={[styles.btnText, { color: border }]}>Settings</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    paddingBottom: 10,
    paddingHorizontal: 14
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "800" },
  sub: { fontSize: 11, fontWeight: "600", lineHeight: 15, marginTop: 2 },
  btn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  btnText: { fontSize: 11, fontWeight: "800" }
});
