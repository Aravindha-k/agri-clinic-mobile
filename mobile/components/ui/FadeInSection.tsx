import { useEffect } from "react";
import type { ReactNode } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";

const FALL_FROM_PX = 48;
const SCALE_FROM = 0.94;
const SCALE_ANCHOR = 30;
const DEFAULT_DURATION = 560;
const LANDING_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const FADE_EASING = Easing.bezier(0.33, 1, 0.68, 1);
export const ENTRANCE_STEP_MS = 360;

export type ScreenEntranceProps = {
  replayKey: number | string;
  sectionStep: number;
};

export function entranceStagger(step: number) {
  return step * ENTRANCE_STEP_MS;
}

export function entranceListStagger(sectionStep: number, index: number, cap = 8) {
  return entranceStagger(sectionStep) + Math.min(index, cap) * 80;
}

type Props = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  replayKey?: number | string;
  style?: StyleProp<ViewStyle>;
  /** Card rows get a soft shadow that settles on landing. */
  variant?: "section" | "card";
};

/** Dramatic top-to-bottom drop with sleek modern landing. */
export function FadeInSection({
  children,
  delay = 0,
  duration = DEFAULT_DURATION,
  replayKey = 0,
  style,
  variant = "section"
}: Props) {
  const { reduced } = usePremiumMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const translateY = useSharedValue(reduced ? 0 : -FALL_FROM_PX);
  const scale = useSharedValue(reduced ? 1 : SCALE_FROM);
  const shadowOpacity = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      shadowOpacity.value = variant === "card" ? 0.08 : 0;
      return;
    }
    opacity.value = 0;
    translateY.value = -FALL_FROM_PX;
    scale.value = SCALE_FROM;
    shadowOpacity.value = 0;

    const fadeDuration = Math.round(duration * 0.62);
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: fadeDuration, easing: FADE_EASING })
    );
    translateY.value = withDelay(delay, withTiming(0, { duration, easing: LANDING_EASING }));
    scale.value = withDelay(delay, withTiming(1, { duration, easing: LANDING_EASING }));

    if (variant === "card" && Platform.OS === "ios") {
      shadowOpacity.value = withDelay(
        delay + Math.round(duration * 0.5),
        withTiming(0.09, { duration: 220, easing: Easing.out(Easing.quad) })
      );
    }
  }, [delay, duration, opacity, reduced, replayKey, scale, shadowOpacity, translateY, variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateY: -SCALE_ANCHOR },
      { scale: scale.value },
      { translateY: SCALE_ANCHOR }
    ],
    ...(variant === "card" && Platform.OS === "ios"
      ? {
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 18,
          shadowOpacity: shadowOpacity.value
        }
      : {})
  }));

  return (
    <Animated.View style={[variant === "card" && styles.cardHost, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = {
  cardHost: {
    overflow: "visible" as const
  }
};
