import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

type Props = {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle;
  maxDelay?: number;
  offsetY?: number;
};

/** Staggered fade + slide-up entrance for list/card items. */
export function CascadeIn({ index, children, style, maxDelay = 360, offsetY = 30 }: Props) {
  const translateY = useRef(new Animated.Value(offsetY)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = Math.min(index * 60, maxDelay);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, speed: 14, bounciness: 8, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true })
    ]).start();
  }, [index, maxDelay, offsetY, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>
  );
}
