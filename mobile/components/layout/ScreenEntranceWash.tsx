import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Colors } from "../../lib/theme";

type Props = {
  replayKey: number | string;
};

/** Subtle top glow that washes in when a screen opens — completes the modern entrance. */
export function ScreenEntranceWash({ replayKey }: Props) {
  const { reduced } = usePremiumMotion();
  const wash = useSharedValue(reduced ? 0.4 : 0);

  useEffect(() => {
    if (reduced) {
      wash.value = 0.4;
      return;
    }
    wash.value = 0;
    wash.value = withSequence(
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
      withTiming(0.42, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
  }, [reduced, replayKey, wash]);

  const style = useAnimatedStyle(() => ({ opacity: wash.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient
        colors={[`${Colors.brand700}18`, `${Colors.brand700}08`, "transparent"]}
        locations={[0, 0.35, 0.72]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
