import { type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Motion } from "../../lib/designSystem";

type Props = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Spring press — subtle elevation feel (200–350ms physics). */
export function PressableCard({ children, style, onPress, disabled, scaleTo = 0.97, ...props }: Props) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: -lift.value * 2 }]
  }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPress={onPress}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, Motion.springSnappy);
        lift.value = withSpring(1, Motion.springSoft);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, Motion.spring);
        lift.value = withSpring(0, Motion.spring);
        props.onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
