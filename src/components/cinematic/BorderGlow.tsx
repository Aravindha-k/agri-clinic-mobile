import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  color?: string;
  duration?: number;
  delay?: number;
  active?: boolean;
};

export default function BorderGlow({
  children,
  style,
  color = "rgba(76,175,130,0.5)",
  duration = 3000,
  delay = 0,
  active = true
}: Props) {
  const { enabled } = usePremiumMotion();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled || !active) {
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: duration / 2,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        })
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      glow.stopAnimation();
    };
  }, [active, delay, duration, enabled, glow]);

  if (!enabled || !active) {
    return <View style={style}>{children}</View>;
  }

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(76,175,130,0.14)", color]
  });

  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.35]
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        style,
        {
          borderColor,
          shadowOpacity
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#4caf82",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10
  }
});
