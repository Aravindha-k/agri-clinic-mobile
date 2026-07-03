import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { fieldCardStyles, type FieldCardVariant } from "../../lib/fieldCardStyles";
import { Spacing } from "../../lib/theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** primary = white elevated card; secondary = light green tint */
  variant?: FieldCardVariant;
};

export function FlatCard({ children, style, padded = false, variant = "primary" }: Props) {
  return (
    <View style={[fieldCardStyles[variant], padded && styles.padded, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: Spacing.cardLg
  }
});
