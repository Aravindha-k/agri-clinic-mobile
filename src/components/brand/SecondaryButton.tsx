import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useTheme } from "../../theme";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function SecondaryButton({ title, onPress, loading, disabled, style }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: c.card, borderColor: c.border },
        (pressed || disabled) && { opacity: 0.88 },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        <Text style={[styles.text, { color: c.primaryDark }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18
  },
  text: { fontSize: 16, fontWeight: "800" }
});
