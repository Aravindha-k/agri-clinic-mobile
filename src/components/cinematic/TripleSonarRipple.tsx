import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  size?: number;
  color?: string;
  active?: boolean;
};

/** Triple expanding sonar rings for live GPS indicator. */
export default function TripleSonarRipple({ size = 6, color = "#4caf82", active = true }: Props) {
  const { enabled } = usePremiumMotion();
  const rings = useRef(
    [0, 1, 2].map(() => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0.6)
    }))
  ).current;

  useEffect(() => {
    if (!active || !enabled) {
      rings.forEach((r) => {
        r.scale.setValue(1);
        r.opacity.setValue(active ? 0.8 : 0.35);
      });
      return;
    }

    const loops = rings.map((ring, i) => {
      const loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ring.scale, {
              toValue: 3,
              duration: 1800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true
            }),
            Animated.timing(ring.scale, { toValue: 1, duration: 0, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(ring.opacity, {
              toValue: 0,
              duration: 1800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true
            }),
            Animated.timing(ring.opacity, { toValue: 0.6, duration: 0, useNativeDriver: true })
          ])
        ])
      );
      const timer = setTimeout(() => loop.start(), i * 700);
      return { loop, timer };
    });

    return () => {
      loops.forEach(({ loop, timer }) => {
        clearTimeout(timer);
        loop.stop();
      });
    };
  }, [active, enabled, rings]);

  return (
    <View style={[styles.wrap, { width: size * 4, height: size * 4 }]}>
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color,
              opacity: ring.opacity,
              transform: [{ scale: ring.scale }]
            }
          ]}
        />
      ))}
      <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  ring: {
    borderWidth: 1,
    position: "absolute"
  },
  dot: {
    position: "absolute"
  }
});
