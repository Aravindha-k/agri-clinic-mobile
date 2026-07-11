import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Layout, Radius, Semantic, Shadow, Spacing } from "../../lib/theme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

function variantStyles(variant: ButtonVariant, pressed: boolean, disabled: boolean) {
  const opacity = disabled ? 0.55 : pressed ? 0.94 : 1;
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: Colors.brand50,
        borderColor: Colors.brand100,
        borderWidth: StyleSheet.hairlineWidth,
        labelColor: Semantic.primary,
        spinner: Semantic.primary,
        opacity
      };
    case "outline":
      return {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        labelColor: Colors.text1,
        spinner: Colors.text1,
        opacity
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        borderColor: "transparent",
        borderWidth: 0,
        labelColor: Colors.text2,
        spinner: Colors.text2,
        opacity
      };
    case "destructive":
      return {
        backgroundColor: Colors.red,
        borderColor: Colors.red,
        borderWidth: 0,
        labelColor: Colors.onPrimary,
        spinner: Colors.onPrimary,
        opacity
      };
    case "primary":
    default:
      return {
        backgroundColor: Semantic.primary,
        borderColor: Semantic.primary,
        borderWidth: 0,
        labelColor: Colors.onPrimary,
        spinner: Colors.onPrimary,
        opacity
      };
  }
}

/** Enterprise button — primary / secondary / outline / ghost / destructive. */
export function PrimaryButton({
  label,
  onPress,
  loading,
  icon,
  disabled,
  variant = "primary",
  style,
  accessibilityLabel
}: Props) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => {
        const v = variantStyles(variant, pressed, isDisabled);
        return [
          styles.btn,
          {
            backgroundColor: v.backgroundColor,
            borderColor: v.borderColor,
            borderWidth: v.borderWidth,
            borderRadius: Radius.button,
            opacity: v.opacity
          },
          variant === "primary" || variant === "destructive" ? Shadow.card : null,
          style
        ];
      }}
    >
      {({ pressed }) => {
        const v = variantStyles(variant, pressed, isDisabled);
        return (
          <>
            {loading ? <ActivityIndicator color={v.spinner} /> : icon}
            <Text style={[styles.label, { color: v.labelColor }]}>{label}</Text>
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    height: Layout.buttonHeight,
    justifyContent: "center",
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.xl
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  }
});
