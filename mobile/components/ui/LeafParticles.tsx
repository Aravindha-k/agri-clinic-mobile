import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Harvest } from "../../lib/designSystem";

const PARTICLES = [
  { x: -42, y: -28, delay: 0, size: 4 },
  { x: 48, y: -18, delay: 400, size: 3 },
  { x: -36, y: 32, delay: 800, size: 3.5 },
  { x: 40, y: 38, delay: 200, size: 4 },
  { x: 0, y: -48, delay: 600, size: 2.5 }
] as const;

function Particle({ x, y, delay, size }: (typeof PARTICLES)[number]) {
  const drift = useSharedValue(0);
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    drift.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, { duration: 2800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, drift, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x + drift.value * 3 },
      { translateY: y - drift.value * 5 },
      { rotate: `${drift.value * 12}deg` }
    ]
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { width: size, height: size * 1.4, borderRadius: size },
        style
      ]}
    />
  );
}

/** Tiny leaf particles orbiting the logo — very slow, elegant. */
export function LeafParticles() {
  const { reduced } = usePremiumMotion();
  if (reduced) return null;

  return (
    <View style={styles.stage} pointerEvents="none">
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1
  },
  particle: {
    backgroundColor: Harvest.leaf,
    position: "absolute"
  }
});
