import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useI18n } from "../../../src/i18n/I18nContext";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Colors, Enterprise, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  step: 1 | 2 | 3 | 4;
  allComplete?: boolean;
};

const STEP_KEYS = [
  "visitFlow.stepLabelFarmer",
  "visitFlow.stepLabelProblem",
  "visitFlow.stepLabelEvidence",
  "visitFlow.stepLabelReview"
] as const;

export function StepIndicator({ step, allComplete }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4].map((index) => (
        <StepSegment
          key={index}
          index={index}
          step={step}
          allComplete={Boolean(allComplete)}
          label={t(STEP_KEYS[index - 1])}
        />
      ))}
    </View>
  );
}

function StepSegment({
  index,
  step,
  allComplete,
  label
}: {
  index: number;
  step: number;
  allComplete: boolean;
  label: string;
}) {
  const { coreMotion } = usePremiumMotion();
  const done = allComplete || index < step;
  const active = !allComplete && index === step;
  const progress = useSharedValue(active || done ? 1 : 0);

  useEffect(() => {
    progress.value = coreMotion
      ? withTiming(active || done ? 1 : 0, { duration: Enterprise.motion.fast })
      : active || done
        ? 1
        : 0;
  }, [active, coreMotion, done, progress]);

  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.4 ? Colors.brand700 : Colors.border2
  }));

  return (
    <View style={styles.segment}>
      <View
        style={[
          styles.dot,
          done && styles.dotDone,
          active && styles.dotActive
        ]}
      >
        {done ? (
          <Ionicons name="checkmark" size={11} color={Colors.onPrimary} />
        ) : (
          <Text style={[styles.dotText, active && styles.dotTextActive]}>{index}</Text>
        )}
      </View>
      <Text style={[styles.label, (active || done) && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
      <Animated.View style={[styles.bar, barStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  segment: {
    alignItems: "center",
    flex: 1,
    gap: 4
  },
  dot: {
    alignItems: "center",
    backgroundColor: Colors.border2,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    width: 20
  },
  dotActive: {
    backgroundColor: Colors.brand700
  },
  dotDone: {
    backgroundColor: Colors.green
  },
  dotText: {
    color: Colors.text3,
    fontSize: 10,
    fontWeight: FontWeight.bold
  },
  dotTextActive: {
    color: Colors.onPrimary
  },
  label: {
    color: Colors.text4,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold
  },
  labelActive: {
    color: Colors.text1
  },
  bar: {
    borderRadius: Radius.xs,
    height: 3,
    width: "100%"
  }
});
