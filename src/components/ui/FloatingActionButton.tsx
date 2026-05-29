import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../theme";
import { FAB_SIZE } from "../../theme/tabBar";
import { shadows } from "../../theme/shadows";

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FloatingActionButton({ onPress, style }: Props) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Start visit"
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: theme.colors.fab, width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 },
        shadows.fab,
        style,
        pressed && styles.pressed
      ]}
    >
      <Ionicons name="add" size={30} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.96 }] }
});
