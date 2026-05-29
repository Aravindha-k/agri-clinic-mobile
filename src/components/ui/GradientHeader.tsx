import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useTheme } from "../../theme";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  compact?: boolean;
};

export function GradientHeader({ title, subtitle, onBack, right, compact }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsetsCompat();
  const c = theme.colors;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + (compact ? 8 : 12), backgroundColor: c.primaryGradientStart }]}>
      <View style={[styles.glow, { backgroundColor: c.primaryGradientEnd }]} />
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
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
  wrap: {
    overflow: "hidden",
    paddingBottom: 18,
    paddingHorizontal: 16
  },
  glow: {
    borderBottomLeftRadius: 120,
    height: 140,
    opacity: 0.35,
    position: "absolute",
    right: -40,
    top: -20,
    width: 200
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  backBtn: {
    marginTop: 2,
    padding: 4
  },
  backPlaceholder: {
    width: 32
  },
  titleBlock: {
    flex: 1
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3
  },
  subtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  right: {
    minWidth: 32
  }
});
