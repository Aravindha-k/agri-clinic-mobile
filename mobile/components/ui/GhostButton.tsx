import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Layout, Radius, Shadow, Spacing } from "../../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: ViewStyle;
  variant?: "default" | "danger";
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export function GhostButton({
  label,
  onPress,
  icon,
  style,
  variant = "default",
  disabled,
  loading,
  accessibilityLabel
}: Props) {
  const isDisabled = Boolean(disabled || loading);
  const labelColor = variant === "danger" ? Colors.red : Colors.text2;
  const borderColor = variant === "danger" ? Colors.red : Colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor,
          borderRadius: Radius.button,
          opacity: isDisabled ? 0.55 : pressed ? 0.92 : 1
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        </>
      )}
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
    height: Layout.buttonHeight,
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
