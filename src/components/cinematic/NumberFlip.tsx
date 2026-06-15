import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, type TextStyle } from "react-native";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  value: string | number;
  style?: TextStyle;
  delay?: number;
  glowInterval?: number;
};

export default function NumberFlip({ value, style, delay = 0, glowInterval = 3000 }: Props) {
  const { enabled } = usePremiumMotion();
  const flipY = useRef(new Animated.Value(-90)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    flipY.setValue(enabled ? -90 : 0);
    opacity.setValue(enabled ? 0 : 1);

    if (!enabled) return;

    Animated.parallel([
      Animated.timing(flipY, {
        toValue: 0,
        duration: 500,
        delay,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true
      })
    ]).start();
  }, [delay, enabled, flipY, opacity, value]);

  useEffect(() => {
    if (!enabled || glowInterval <= 0) return;
    const interval = setInterval(() => {
      setGlowing(true);
      setTimeout(() => setGlowing(false), 1000);
    }, glowInterval);
    return () => clearInterval(interval);
  }, [enabled, glowInterval, value]);

  return (
    <Animated.Text
      style={[
        styles.text,
        style,
        enabled && {
          opacity,
          transform: [{ perspective: 400 }, { rotateX: flipY.interpolate({ inputRange: [-90, 0], outputRange: ["-90deg", "0deg"] }) }]
        },
        glowing && styles.glow
      ]}
    >
      {value}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ["tabular-nums"]
  },
  glow: {
    textShadowColor: "#4ade80",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  }
});
