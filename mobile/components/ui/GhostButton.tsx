import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Shadow } from "../../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function GhostButton({ label, onPress, icon, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: Colors.brand100,
          borderRadius: Radius.button,
          opacity: pressed ? 0.92 : 1
        },
        style
      ]}
    >
      {icon}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    ...Shadow.card
  },
  label: {
    color: Colors.text2,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium
  }
});
