import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

const STAGGER_MS = 130;
const DURATION_MS = 880;

type RingProps = {
  index: number;
  trigger: number | string;
  baseSize: number;
  maxScale: number;
  color: string;
  borderWidth: number;
  reduced: boolean;
  startDelay: number;
};

function RippleRing({
  index,
  trigger,
  baseSize,
  maxScale,
  color,
  borderWidth,
  reduced,
  startDelay
}: RingProps) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const half = baseSize / 2;

  useEffect(() => {
    if (reduced) {
      scale.value = 0.4;
      opacity.value = 0;
      return;
    }

    const delay = startDelay + index * STAGGER_MS;
    scale.value = 0.4;
    opacity.value = Math.max(0.12, 0.34 - index * 0.08);

    scale.value = withDelay(
      delay,
      withTiming(maxScale, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      delay,
      withTiming(0, { duration: DURATION_MS, easing: Easing.out(Easing.quad) })
    );
  }, [index, maxScale, opacity, reduced, scale, startDelay, trigger]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: baseSize,
          height: baseSize,
          borderRadius: half,
          borderColor: color,
          borderWidth,
          marginLeft: -half,
          marginTop: -half
        },
        ringStyle
      ]}
    />
  );
}

type Props = {
  anchorX: number;
  anchorY: number;
  trigger?: number | string;
  baseSize?: number;
  maxScale?: number;
  color?: string;
  borderWidth?: number;
  ringCount?: number;
  startDelay?: number;
};

/** Expanding concentric ripples from a logo anchor — one-shot entrance burst. */
export function LogoRippleBurst({
  anchorX,
  anchorY,
  trigger = 0,
  baseSize = 68,
  maxScale = 5.2,
  color = "rgba(15, 107, 67, 0.42)",
  borderWidth = 1.5,
  ringCount = 3,
  startDelay = 0
}: Props) {
  const { reduced } = usePremiumMotion();

  if (reduced) {
    return null;
  }

  return (
    <View style={styles.clip} pointerEvents="none">
      <View style={[styles.origin, { left: anchorX, top: anchorY }]}>
        {Array.from({ length: ringCount }, (_, index) => (
          <RippleRing
            key={index}
            index={index}
            trigger={trigger}
            baseSize={baseSize}
            maxScale={maxScale}
            color={color}
            borderWidth={borderWidth}
            reduced={reduced}
            startDelay={startDelay}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0
  },
  origin: {
    alignItems: "center",
    height: 0,
    justifyContent: "center",
    position: "absolute",
    width: 0
  },
  ring: {
    position: "absolute"
  }
});
