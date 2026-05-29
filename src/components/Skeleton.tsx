import { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { radius } from "../theme/radius";

type Props = {
  width?: number | `${number}%`;
  height: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
};

export function Skeleton({ width = "100%", height, style, borderRadius = radius.sm }: Props) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 600, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.skeleton,
          opacity: pulse
        },
        style
      ]}
    />
  );
}
