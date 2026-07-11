import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";

/** Full breath cycle — early-morning sun, not a pulse flash. */
const CYCLE_MS = 7000;
const HALF_MS = CYCLE_MS / 2;

const OPACITY_MIN = 0.15;
const OPACITY_MAX = 0.35;
const SCALE_MIN = 0.9;
const SCALE_MAX = 1.1;

type Props = {
  /** Diameter of the glow disc (should be larger than the logo badge). */
  size: number;
};

/**
 * Soft golden sunlight glow for the Home logo.
 * Logo stays separate — this only renders behind it.
 */
export function SunGlow({ size }: Props) {
  const { reduced, enabled } = usePremiumMotion();
  const animate = enabled && !reduced;

  const opacity = useSharedValue(animate ? OPACITY_MIN : 0.18);
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);

    if (!animate) {
      opacity.value = 0.18;
      scale.value = 1;
      return;
    }

    opacity.value = OPACITY_MIN;
    scale.value = SCALE_MIN;

    const ease = Easing.inOut(Easing.sin);

    opacity.value = withRepeat(
      withSequence(
        withTiming(OPACITY_MAX, { duration: HALF_MS, easing: ease }),
        withTiming(OPACITY_MIN, { duration: HALF_MS, easing: ease })
      ),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(SCALE_MAX, { duration: HALF_MS, easing: ease }),
        withTiming(SCALE_MIN, { duration: HALF_MS, easing: ease })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [animate, opacity, scale]);

  const motionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  const outer = size;
  const mid = Math.round(size * 0.72);
  const core = Math.round(size * 0.42);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.stage,
        motionStyle,
        {
          width: outer,
          height: outer,
          marginLeft: -outer / 2,
          marginTop: -outer / 2
        }
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Soft layered discs — large “blur” without BlurView cost */}
      <View
        style={[
          styles.disc,
          styles.outerDisc,
          { width: outer, height: outer, borderRadius: outer / 2 }
        ]}
      />
      <View
        style={[
          styles.disc,
          styles.midDisc,
          {
            width: mid,
            height: mid,
            borderRadius: mid / 2,
            left: (outer - mid) / 2,
            top: (outer - mid) / 2
          }
        ]}
      />
      <View
        style={[
          styles.disc,
          styles.coreDisc,
          {
            width: core,
            height: core,
            borderRadius: core / 2,
            left: (outer - core) / 2,
            top: (outer - core) / 2
          }
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    left: "50%",
    position: "absolute",
    top: "50%",
    zIndex: 0
  },
  disc: {
    position: "absolute"
  },
  outerDisc: {
    backgroundColor: "rgba(245, 215, 140, 0.28)"
  },
  midDisc: {
    backgroundColor: "rgba(250, 224, 160, 0.38)"
  },
  coreDisc: {
    backgroundColor: "rgba(255, 236, 185, 0.45)"
  }
});
