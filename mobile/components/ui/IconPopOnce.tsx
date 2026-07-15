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
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { LucideGlyph } from "./AppIcon";

type Props = {
  icon: LucideIcon;
  size?: number;
  color?: string;
  delay?: number;
};

/** Icon pops in once on mount — premium stat reveal. */
export function IconPopOnce({ icon, size = 18, color = "#FFFFFF", delay = 0 }: Props) {
  const { coreMotion } = usePremiumMotion();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!coreMotion) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: Motion.fast, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(delay, withSpring(1, Motion.springSnappy));
  }, [coreMotion, delay, opacity, scale]);

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
