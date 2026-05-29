import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "md" | "sm";
  style?: ViewStyle;
};

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  size = "md",
  style
}: Props) {
  const { colors, radius, layout, shadows } = useDesignSystem();
  const isPrimary = variant === "primary";
  const minH = size === "sm" ? layout.buttonMinHeightSm : layout.buttonMinHeight;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: minH,
          borderRadius: radius.button,
          backgroundColor:
            variant === "outline" || variant === "ghost"
              ? "transparent"
              : variant === "secondary"
                ? colors.primarySoft
                : colors.primary,
          borderColor: variant === "outline" ? colors.primary : "transparent",
          borderWidth: variant === "outline" ? 1.5 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }]
        },
        isPrimary && shadows.card,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#FFFFFF" : colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            size === "sm" && styles.textSm,
            {
              color:
                variant === "primary"
                  ? "#FFFFFF"
                  : variant === "secondary"
                    ? colors.primaryDark
                    : colors.primary
            }
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  text: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.15
  },
  textSm: {
    fontSize: 13
  }
});
