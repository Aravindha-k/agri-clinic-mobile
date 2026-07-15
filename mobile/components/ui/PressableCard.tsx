import { type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Motion } from "../../lib/designSystem";

type Props = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Spring press — subtle elevation feel (200–350ms physics). */
export function PressableCard({ children, style, onPress, disabled, scaleTo = 0.97, ...props }: Props) {
  const { coreMotion } = usePremiumMotion();
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
      accessibilityRole={props.accessibilityRole ?? (onPress ? "button" : undefined)}
      accessibilityState={{ ...props.accessibilityState, disabled: Boolean(disabled) }}
      onPressIn={(e) => {
        if (coreMotion) {
          scale.value = withSpring(scaleTo, Motion.springSnappy);
          lift.value = withSpring(1, Motion.springSoft);
        }
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (coreMotion) {
          scale.value = withSpring(1, Motion.spring);
          lift.value = withSpring(0, Motion.spring);
        } else {
          cancelAnimation(scale);
          cancelAnimation(lift);
          scale.value = 1;
          lift.value = 0;
        }
        props.onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
