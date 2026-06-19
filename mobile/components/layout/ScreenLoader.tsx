import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight } from "../../lib/theme";

type Props = {
  style?: ViewStyle;
  compact?: boolean;
  message?: string;
};

/** Minimal loading placeholder — no branded animation. */
export function ScreenLoader({ style, compact = false, message }: Props) {
  return (
    <View style={[styles.host, compact && styles.hostCompact, style]}>
      <ActivityIndicator color={Colors.brand700} size={compact ? "small" : "large"} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    flex: 1,
    justifyContent: "center",
    minHeight: 120,
    paddingHorizontal: 20,
    width: "100%"
  },
  hostCompact: {
    flex: 0,
    minHeight: 72,
    paddingVertical: 16
  },
  message: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: 10,
    textAlign: "center"
  }
});
