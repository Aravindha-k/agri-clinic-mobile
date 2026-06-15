import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Text, type TextStyle } from "react-native";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  children: ReactNode;
  style?: TextStyle;
  interval?: number;
};

export default function GlowText({ children, style, interval = 3000 }: Props) {
  const { enabled } = usePremiumMotion();
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: interval / 3,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: interval / 3,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      opacity.stopAnimation();
    };
  }, [enabled, interval, opacity]);

  if (!enabled) {
    return <Text style={style}>{children}</Text>;
  }

  return (
    <Animated.Text
      style={[
        style,
        {
          opacity,
          textShadowColor: "#4caf82",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8
        }
      ]}
    >
      {children}
    </Animated.Text>
  );
}
