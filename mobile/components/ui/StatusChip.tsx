import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Colors, Enterprise, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";

export type StatusChipVariant =
  | "success"
  | "warning"
  | "error"
  | "pending"
  | "offline"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "gray"
  | "purple";

const VARIANT_STYLES: Record<StatusChipVariant, { bg: string; text: string }> = {
  success: { bg: Colors.greenBg, text: Colors.greenText },
  warning: { bg: Colors.amberBg, text: Colors.amberText },
  error: { bg: Colors.redBg, text: Colors.redText },
  pending: { bg: Colors.amberBg, text: Colors.amberText },
  offline: { bg: Colors.brand50, text: Colors.text3 },
  green: { bg: Colors.greenBg, text: Colors.greenText },
  amber: { bg: Colors.amberBg, text: Colors.amberText },
  red: { bg: Colors.redBg, text: Colors.redText },
  blue: { bg: Colors.blueBg, text: Colors.blueText },
  gray: { bg: Colors.brand50, text: Colors.text3 },
  purple: { bg: Colors.purpleBg, text: Colors.purpleText }
};

type Props = {
  label: string;
  variant: StatusChipVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function StatusChip({ label, variant, icon, style }: Props) {
  const tone = VARIANT_STYLES[variant] ?? VARIANT_STYLES.gray;
  const text = label?.trim() || "—";

  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }, style]}>
      {icon ? <Ionicons name={icon} size={13} color={tone.text} /> : null}
      <Text style={[styles.text, { color: tone.text }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: Colors.border,
    borderRadius: Radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    maxWidth: "100%",
    minHeight: Layout.touchTargetMin / 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5
  },
  text: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold
  }
});
