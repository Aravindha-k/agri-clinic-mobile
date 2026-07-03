import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND } from "../../config/brand";
import { FONTS } from "../../theme/fonts";
import { Spacing } from "../../../mobile/lib/theme";

const GREEN = "#0B6B3A";
const GREEN_DARK = "#1B4332";
const SCREEN_BG = "#F8F7F2";

function FeatureItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.item}>
      <Ionicons name={icon} size={14} color={GREEN} />
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Pinned bottom — feature hints + clinic name. */
export function LoginPageFooter() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.featureRow}>
        <FeatureItem icon="cloud-offline-outline" label="Works offline" />
        <View style={styles.divider} />
        <FeatureItem icon="location-outline" label="GPS enabled" />
        <View style={styles.divider} />
        <FeatureItem icon="stats-chart-outline" label="Field visit tracking" />
      </View>

      <View style={styles.brandRow}>
        <Ionicons name="leaf-outline" size={13} color={GREEN} />
        <Text style={styles.brand}>{BRAND.companyName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: SCREEN_BG,
    borderTopColor: "rgba(229,224,214,0.9)",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    width: "100%"
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 5,
    minWidth: 0,
    paddingHorizontal: 4
  },
  label: {
    color: GREEN_DARK,
    fontFamily: FONTS.medium,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center"
  },
  divider: {
    backgroundColor: "rgba(27,67,50,0.14)",
    height: 24,
    width: 1
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: Spacing.sm
  },
  brand: {
    color: "#6B7668",
    fontFamily: FONTS.regular,
    fontSize: 11
  }
});
