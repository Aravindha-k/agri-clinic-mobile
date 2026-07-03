import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Colors, Enterprise, Radius, Spacing } from "../../lib/theme";

type Props = {
  step: 1 | 2 | 3 | 4;
  allComplete?: boolean;
};

export function StepIndicator({ step, allComplete }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4].map((index) => (
        <StepSegment
          key={index}
          index={index}
          step={step}
          allComplete={Boolean(allComplete)}
        />
      ))}
    </View>
  );
}

function StepSegment({
  index,
  step,
  allComplete
}: {
  index: number;
  step: number;
  allComplete: boolean;
}) {
  const done = allComplete || index < step;
  const active = !allComplete && index === step;
  const progress = useSharedValue(active ? 1 : done ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active || done ? 1 : 0, { duration: Enterprise.motion.normal });
  }, [active, done, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? Colors.brand700 : active ? Colors.brand300 : Colors.border2,
    opacity: 0.35 + progress.value * 0.65
  }));

  return <Animated.View style={[styles.pill, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  pill: {
    borderRadius: Radius.xs,
    flex: 1,
    height: 5
  }
});
