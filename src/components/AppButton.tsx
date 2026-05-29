import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius, space } from "../theme/layout";
import { shadows } from "../theme/shadows";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
};

export function AppButton({ title, onPress, loading, variant = "primary", style }: Props) {
  const textStyle = variant === "primary" ? styles.primaryText : variant === "secondary" ? styles.secondaryText : styles.ghostText;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        variant === "primary" && shadows.card,
        pressed && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : colors.primary} />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.button,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: space.lg
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.primarySoft
  },
  ghost: {
    backgroundColor: "transparent",
    minHeight: 44
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }]
  },
  text: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  primaryText: {
    color: "#FFFFFF"
  },
  secondaryText: {
    color: colors.primaryDark
  },
  ghostText: {
    color: colors.primary
  }
});
