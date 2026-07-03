import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from "react-native-reanimated";

const PARTICLE_COUNT = 6;

type ParticleSpec = {
  delay: number;
  duration: number;
  offsetX: number;
  driftY: number;
  size: number;
};

function buildParticles(): ParticleSpec[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    delay: 180 + index * 110,
    duration: 2400 + (index % 4) * 320,
    offsetX: ((index % 5) - 2) * 16 + (index % 3) * 6,
    driftY: 72 + (index % 5) * 14,
    size: 2 + (index % 2)
  }));
}

type ParticleProps = {
  originX: number;
  originY: number;
  spec: ParticleSpec;
};

function GoldenParticle({ originX, originY, spec }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withRepeat(
        withTiming(1, { duration: spec.duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
  }, [progress, spec.delay, spec.duration]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 0.75, 1], [0, 0.42, 0.2, 0]),
    transform: [
      { translateX: originX + spec.offsetX - spec.size / 2 },
      { translateY: originY + interpolate(progress.value, [0, 1], [6, -spec.driftY]) },
      { scale: interpolate(progress.value, [0, 0.4, 1], [0.5, 1, 0.7]) }
    ]
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        style,
        { width: spec.size, height: spec.size, borderRadius: spec.size / 2 }
      ]}
    />
  );
}

type Props = {
  originX: number;
  originY: number;
};

/** Soft golden seeds drifting up from the sunburst. */
export function SplashGoldenParticles({ originX, originY }: Props) {
  const particles = useMemo(() => buildParticles(), []);

  return (
    <View style={styles.layer} pointerEvents="none">
      {particles.map((spec, index) => (
        <GoldenParticle key={index} originX={originX} originY={originY} spec={spec} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible"
  },
  particle: {
    backgroundColor: "#E8C872",
    position: "absolute",
    shadowColor: "#D4B86A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 2
  }
});
