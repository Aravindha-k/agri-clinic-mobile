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

/** Full breath cycle — early-morning sun. */
const CYCLE_MS = 7000;
const HALF_MS = CYCLE_MS / 2;

/** Slightly stronger than first experiment so glow reads on blue glass. */
const OPACITY_MIN = 0.28;
const OPACITY_MAX = 0.55;
const SCALE_MIN = 0.92;
const SCALE_MAX = 1.12;

type Props = {
  /** Diameter of the glow disc (larger than the logo badge). */
  size: number;
};

/**
 * Soft golden sunlight glow for the Home logo — sits behind the mark.
 */
export function SunGlow({ size }: Props) {
  const { coreMotion } = usePremiumMotion();
  const animate = coreMotion;

  const opacity = useSharedValue(animate ? OPACITY_MIN : 0.32);
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);

    if (!animate) {
      opacity.value = 0.32;
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

  const mid = Math.round(size * 0.7);
  const core = Math.round(size * 0.4);

  return (
    <View
      pointerEvents="none"
      style={[styles.host, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.stage, motionStyle, { width: size, height: size }]}>
        <View
          style={[
            styles.disc,
            styles.outerDisc,
            { width: size, height: size, borderRadius: size / 2 }
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
              left: (size - mid) / 2,
              top: (size - mid) / 2
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
              left: (size - core) / 2,
              top: (size - core) / 2
            }
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0
  },
  stage: {
    alignItems: "center",
    justifyContent: "center"
  },
  disc: {
    position: "absolute"
  },
  outerDisc: {
    backgroundColor: "rgba(242, 196, 96, 0.55)"
  },
  midDisc: {
    backgroundColor: "rgba(255, 220, 140, 0.65)"
  },
  coreDisc: {
    backgroundColor: "rgba(255, 236, 190, 0.8)"
  }
});
