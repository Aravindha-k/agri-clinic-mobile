import { StyleSheet, View } from "react-native";
import { Colors, Radius } from "../../lib/theme";

type Props = {
  step: 1 | 2 | 3;
  /** Final step submit view — all pills complete. */
  allComplete?: boolean;
};

export function StepIndicator({ step, allComplete }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3].map((index) => {
        const done = allComplete || index < step;
        const active = !allComplete && index === step;
        const backgroundColor = done || allComplete ? Colors.brand700 : active ? Colors.brand300 : Colors.border2;
        return <View key={index} style={[styles.pill, { backgroundColor }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6
  },
  pill: {
    borderRadius: 2,
    flex: 1,
    height: 4
  }
});
