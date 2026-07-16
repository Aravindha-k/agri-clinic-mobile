import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type ViewStyle } from "react-native";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Colors, Radius } from "../../lib/theme";

type Props = {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** Loading placeholder — static when reduced motion is enabled. */
export function Skeleton({ width, height, borderRadius = Radius.sm, style }: Props) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  const { coreMotion } = usePremiumMotion();

  useEffect(() => {
    if (!coreMotion) {
      opacity.setValue(0.55);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [coreMotion, opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.border,
          opacity
        },
        style
      ]}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    />
  );
}

const styles = StyleSheet.create({
  block: {}
});
