import { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Colors, Layout, Radius } from "../../lib/theme";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

/** White bordered surface card — replaces glass GlassCard (surface variant). */
export function FlatCard({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: Layout.cardBorderWidth,
    overflow: "hidden"
  }
});
