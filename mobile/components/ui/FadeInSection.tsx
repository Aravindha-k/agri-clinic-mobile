import { useEffect } from "react";
import type { ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Enterprise } from "../../lib/theme";

const FALL_FROM_PX = 10;
const SCALE_FROM = 0.98;
const DEFAULT_DURATION = Enterprise.motion.normal;
const LANDING_EASING = Easing.out(Easing.cubic);
const FADE_EASING = Easing.out(Easing.cubic);
export const ENTRANCE_STEP_MS = 48;

export type ScreenEntranceProps = {
  replayKey: number | string;
  sectionStep: number;
};

export function entranceStagger(step: number) {
  return step * ENTRANCE_STEP_MS;
}

export function entranceListStagger(sectionStep: number, index: number, cap = 6) {
  return entranceStagger(sectionStep) + Math.min(index, cap) * 32;
}

type Props = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  replayKey?: number | string;
  style?: StyleProp<ViewStyle>;
  variant?: "section" | "card";
  /** Initial scale for entrance — default 0.98 */
  scaleFrom?: number;
};

/** Subtle fade + lift — production timing (≤200ms). */
export function FadeInSection({
  children,
  delay = 0,
  duration = DEFAULT_DURATION,
  replayKey = 0,
  style,
  variant = "section",
  scaleFrom = SCALE_FROM
}: Props) {
  const { coreMotion } = usePremiumMotion();
  const opacity = useSharedValue(coreMotion ? 0 : 1);
  const translateY = useSharedValue(coreMotion ? FALL_FROM_PX : 0);
  const scale = useSharedValue(coreMotion ? scaleFrom : 1);

  useEffect(() => {
    if (!coreMotion) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      return;
    }
    opacity.value = 0;
    translateY.value = FALL_FROM_PX;
    scale.value = scaleFrom;

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: Math.round(duration * 0.85), easing: FADE_EASING })
    );
    translateY.value = withDelay(delay, withTiming(0, { duration, easing: LANDING_EASING }));
    scale.value = withDelay(delay, withTiming(1, { duration, easing: LANDING_EASING }));
  }, [coreMotion, delay, duration, opacity, replayKey, scale, scaleFrom, translateY, variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }]
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
