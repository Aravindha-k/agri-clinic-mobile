import { ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  offset?: number;
};

const DURATION = 260;
const EASE = Easing.out(Easing.cubic);

/** Lightweight fade + slide-up on mount (tuned for snappy field-app feel). */
export function FadeInView({ children, style, delay = 0, offset = 8 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION,
        delay,
        easing: EASE,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION,
        delay,
        easing: EASE,
        useNativeDriver: true
      })
    ]).start();
  }, [delay, opacity, offset, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
