import { StyleSheet, View, type ViewStyle } from "react-native";
import { Spacing } from "../../lib/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Wrapping chip row — avoids nested horizontal ScrollView inside FlashList headers. */
export function FilterChipRow({ children, style }: Props) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm
  }
});
