import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "../brand/BrandLogo";
import { BRAND } from "../../config/brand";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useTheme } from "../../theme";
import { stitch } from "../../theme/stitchTokens";

type Props = {
  /** Screen title when mode is `screen`; ignored for brand bar. */
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Brand row (Home/Farmers tabs) vs inner screen with back. */
  mode?: "brand" | "screen";
};

export function StitchAppBar({ title, subtitle, onBack, right, mode = "screen" }: Props) {
  const insets = useSafeAreaInsetsCompat();
  const { theme } = useTheme();
  const c = theme.colors;

  if (mode === "brand") {
    return (
      <View style={[styles.brandWrap, { paddingTop: insets.top + 8, backgroundColor: c.card, borderBottomColor: c.borderSubtle }]}>
        <View style={styles.brandRow}>
          <BrandLogo variant="header" />
          <Text style={[styles.brandTitle, { color: c.primaryDark }]} numberOfLines={1}>
            {BRAND.appName}
          </Text>
          <View style={styles.rightSlot}>{right}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screenWrap, { paddingTop: insets.top + 6, backgroundColor: c.card, borderBottomColor: c.borderSubtle }]}>
      <View style={styles.screenRow}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.primaryDark} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.titles}>
          <Text style={[styles.screenTitle, { color: c.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.screenSub, { color: c.muted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightSlot}>{right ?? <View style={styles.backSpacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 16
  },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  brandTitle: { flex: 1, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  screenWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: 12
  },
  screenRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  backBtn: { padding: 4 },
  backSpacer: { width: 32 },
  titles: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  screenTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.25 },
  screenSub: { fontSize: 12, fontWeight: "600", lineHeight: 16, marginTop: 2 },
  rightSlot: { alignItems: "flex-end", minWidth: 32 }
});
