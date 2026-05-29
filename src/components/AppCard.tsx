import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/layout";
import { shadows } from "../theme/shadows";

export function AppCard({ children, style, elevated }: { children: ReactNode; style?: ViewStyle; elevated?: boolean }) {
  return <View style={[styles.card, elevated && styles.elevated, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18
  },
  elevated: {
    borderWidth: 0,
    ...shadows.card
  }
});
