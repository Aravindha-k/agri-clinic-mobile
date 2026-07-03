import { useEffect, useState } from "react";
import { Text, type TextStyle } from "react-native";
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

type Props = {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  style?: TextStyle;
};

/** Counts up to the target value — premium stat reveal. */
export function AnimatedCounter({ value, suffix = "", decimals = 0, duration = 700, style }: Props) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState("0");

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      const text =
        decimals > 0 ? current.toFixed(decimals) : String(Math.round(current));
      runOnJS(setDisplay)(text);
    },
    [decimals]
  );

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [duration, progress, value]);

  return (
    <Text style={style}>
      {display}
      {suffix}
    </Text>
  );
}
