import type { LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { Motion } from "../../lib/designSystem";
import { LucideGlyph } from "./AppIcon";

type Props = {
  icon: LucideIcon;
  size?: number;
  color?: string;
  delay?: number;
};

/** Icon pops in once on mount — premium stat reveal. */
export function IconPopOnce({ icon, size = 18, color = "#FFFFFF", delay = 0 }: Props) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: Motion.fast, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(delay, withSpring(1, Motion.springSnappy));
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={style}>
      <LucideGlyph icon={icon} size={size} color={color} />
    </Animated.View>
  );
}
