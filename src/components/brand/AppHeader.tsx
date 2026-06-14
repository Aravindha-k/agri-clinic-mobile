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
  const light = !isDark;
  const bg = isDark ? colors.offlineBackground : colors.card;
  const titleColor = light ? colors.text : "#FFFFFF";
  const subColor = light ? colors.muted : "rgba(255,255,255,0.86)";
  const iconColor = light ? colors.primaryDark : "#FFFFFF";

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 8,
          backgroundColor: bg,
          paddingBottom: layout.headerPaddingBottom,
          borderBottomColor: colors.borderSubtle ?? colors.border,
          borderBottomWidth: light ? StyleSheet.hairlineWidth : 0
        }
      ]}
    >
      {isDark ? (
        <>
          <View style={[styles.glow, { backgroundColor: colors.offlineCard }]} />
          <View style={[styles.leafA, { opacity: 0.08 }]}>
            <Ionicons name="leaf" size={64} color="#FFFFFF" />
          </View>
        </>
      ) : null}
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={iconColor} />
          </Pressable>
        ) : null}
        {showLogoMark ? (
          <View style={styles.logoSlot}>
            <AppLogo size="sm" bare variant="dark" />
          </View>
        ) : null}
        <View style={styles.titles}>
          <Text
            style={[styles.title, large && styles.titleLg, { color: titleColor }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.sub, { color: subColor }]} numberOfLines={1}>
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
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", letterSpacing: -0.2 },
  titleLg: { fontSize: 21 },
  titleDark: { fontSize: 18 },
  sub: { color: "rgba(255,255,255,0.86)", fontSize: 12, lineHeight: 17, marginTop: 2 },
  subDark: { color: "rgba(255,255,255,0.7)" },
  right: { alignItems: "flex-end", flexShrink: 0, minWidth: 28 }
});
