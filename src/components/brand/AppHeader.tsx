import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { layout } from "../../theme/designSystem";
import { AppLogo } from "./AppLogo";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  showLogoMark?: boolean;
  large?: boolean;
  variant?: "brand" | "dark";
};

export function AppHeader({ title, subtitle, onBack, right, showLogoMark = false, large = false, variant = "brand" }: Props) {
  const insets = useSafeAreaInsetsCompat();
  const { colors } = useDesignSystem();
  const isDark = variant === "dark";
  const bg = isDark ? colors.offlineBackground : colors.primaryGradientStart;
  const glow = isDark ? colors.offlineCard : colors.primaryGradientEnd;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, backgroundColor: bg, paddingBottom: layout.headerPaddingBottom }]}>
      <View style={[styles.glow, { backgroundColor: glow }]} />
      <View style={[styles.leafA, { opacity: isDark ? 0.08 : 0.12 }]}>
        <Ionicons name="leaf" size={64} color="#FFFFFF" />
      </View>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {showLogoMark ? (
          <View style={styles.logoSlot}>
            <AppLogo size="xs" variant="onPrimary" />
          </View>
        ) : null}
        <View style={styles.titles}>
          <Text style={[styles.title, large && styles.titleLg, isDark && styles.titleDark]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.sub, isDark && styles.subDark]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", paddingHorizontal: layout.screenPaddingH },
  glow: {
    borderBottomLeftRadius: 120,
    height: 140,
    opacity: 0.28,
    position: "absolute",
    right: -48,
    top: -28,
    width: 200
  },
  leafA: { pointerEvents: "none", position: "absolute", right: 20, top: 24 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  back: { padding: 2 },
  logoSlot: { flexShrink: 0 },
  titles: { flex: 1, minWidth: 0 },
  title: { color: "#FFFFFF", fontSize: 19, fontWeight: "900", letterSpacing: -0.25 },
  titleLg: { fontSize: 21 },
  titleDark: { fontSize: 18 },
  sub: { color: "rgba(255,255,255,0.86)", fontSize: 12, lineHeight: 17, marginTop: 2 },
  subDark: { color: "rgba(255,255,255,0.7)" },
  right: { alignItems: "flex-end", flexShrink: 0, minWidth: 28 }
});
