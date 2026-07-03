import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";import { Colors, Enterprise, FontSize, FontWeight, Layout, Radius, Shadow, Spacing } from "../../lib/theme";
type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: ViewStyle;
  variant?: "default" | "danger";
};

export function GhostButton({ label, onPress, icon, style, variant = "default" }: Props) {
  const labelColor = variant === "danger" ? Colors.red : Colors.text2;
  const borderColor = variant === "danger" ? Colors.red : Colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor,
          borderRadius: Radius.button,
          opacity: pressed ? 0.92 : 1
        },
        style
      ]}
    >
      {icon}
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    height: Layout.buttonHeight - 8,
    justifyContent: "center",
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.lg,
    ...Shadow.card
  },
  label: {
    color: Colors.text2,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  }
});
