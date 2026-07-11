import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info" | "brand";

type Props = {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
};

const TONE: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: Colors.surfaceMuted, fg: Colors.text2 },
  success: { bg: Colors.greenBg, fg: Colors.greenText },
  warning: { bg: Colors.amberBg, fg: Colors.amberText },
  error: { bg: Colors.redBg, fg: Colors.redText },
  info: { bg: Colors.blueBg, fg: Colors.blueText },
  brand: { bg: Colors.brand50, fg: Colors.brand700 }
};

/** Compact enterprise badge for counts, sync state, and status labels. */
export function EnterpriseBadge({ label, tone = "neutral", style }: Props) {
  const colors = TONE[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]} accessibilityRole="text">
      <Text style={[styles.text, { color: colors.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  text: {
    fontSize: FontSize.label,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2
  }
});
