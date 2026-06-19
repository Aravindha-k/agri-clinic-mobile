import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from "../../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, loading, icon, disabled, style }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: Colors.brand700,
          borderRadius: Radius.button,
          opacity: isDisabled ? 0.55 : pressed ? 0.92 : 1
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.surface} />
      ) : (
        <>
          {icon}
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    ...Shadow.cardRaised
  },
  label: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  }
});
