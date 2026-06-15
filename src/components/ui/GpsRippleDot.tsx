import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { BRAND_COLORS } from "../../config/brand";

type Props = {
  active?: boolean;
  color?: string;
  size?: number;
};

export function GpsRippleDot({ active = true, color = BRAND_COLORS.primary, size = 6 }: Props) {
  const ripple1 = useRef(new Animated.Value(1)).current;
  const ripple1Opacity = useRef(new Animated.Value(0.6)).current;
  const ripple2 = useRef(new Animated.Value(1)).current;
  const ripple2Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!active) return;

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ripple1, { toValue: 2.8, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ripple1Opacity, { toValue: 0, duration: 2000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(ripple1, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ripple1Opacity, { toValue: 0.6, duration: 0, useNativeDriver: true })
        ])
      ])
    );

    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.parallel([
          Animated.timing(ripple2, { toValue: 2.8, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ripple2Opacity, { toValue: 0, duration: 2000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(ripple2, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ripple2Opacity, { toValue: 0.4, duration: 0, useNativeDriver: true })
        ])
      ])
    );

    loop1.start();
    loop2.start();
    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [active, ripple1, ripple1Opacity, ripple2, ripple2Opacity]);

  return (
    <View style={[styles.wrap, { width: size * 3, height: size * 3 }]}>
      {active ? (
        <>
          <Animated.View
            style={[
              styles.ripple,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: ripple1Opacity,
                transform: [{ scale: ripple1 }]
              }
            ]}
          />
          <Animated.View
            style={[
              styles.ripple,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: ripple2Opacity,
                transform: [{ scale: ripple2 }]
              }
            ]}
          />
        </>
      ) : null}
      <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  ripple: {
    position: "absolute"
  },
  dot: {
    zIndex: 2
  }
});
