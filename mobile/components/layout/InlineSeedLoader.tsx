import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight } from "../../lib/theme";

type Props = {
  label?: string;
  style?: ViewStyle;
};

/** Compact list-footer spinner. */
export function InlineSeedLoader({ label, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator color={Colors.brand700} size="small" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 16
  },
  label: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  }
});
