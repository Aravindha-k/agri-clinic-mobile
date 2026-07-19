import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "../../lib/theme";

type Props = {
  visible: boolean;
};

/**
 * Legacy footer slot — employee end-workday controls were removed.
 * Workdays end via automatic 9-hour expiry or admin action only.
 */
export function WorkdayActionFooter({ visible }: Props) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return <View style={[styles.spacer, { height: Math.max(insets.bottom, Spacing.sm) }]} />;
}

const styles = StyleSheet.create({
  spacer: {
    backgroundColor: Colors.bg
  }
});
