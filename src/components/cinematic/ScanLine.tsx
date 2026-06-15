import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  color?: string;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
};

export default function ScanLine({
  color = "rgba(76,175,130,0.55)",
  duration = 2000,
  delay = 1200,
  style
}: Props) {
  const { enabled } = usePremiumMotion();
  const pos = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const start = () => {
      pos.setValue(0);
      Animated.timing(pos, {
        toValue: 1,
        duration,
        easing: Easing.inOut(Easing.ease),
        delay,
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) timerRef.current = setTimeout(start, 1500);
      });
    };

    start();
    return () => {
      pos.stopAnimation();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delay, duration, enabled, pos]);

  if (!enabled) return null;

  const translateY = pos.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 120]
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, style]} pointerEvents="none">
      <Animated.View style={[styles.line, { transform: [{ translateY }] }]}>
        <LinearGradient
          colors={["transparent", color, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden"
  },
  line: {
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  }
});
