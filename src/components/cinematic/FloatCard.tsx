import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  distance?: number;
  duration?: number;
  delay?: number;
};

export default function FloatCard({ children, style, distance = 7, duration = 3000, delay = 0 }: Props) {
  const { enabled } = usePremiumMotion();
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, {
          toValue: -distance,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      y.stopAnimation();
    };
  }, [delay, distance, duration, enabled, y]);

  if (!enabled) return <>{children}</>;

  return <Animated.View style={[style, { transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}
