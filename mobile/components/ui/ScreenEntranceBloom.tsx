import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Colors } from "../../lib/theme";

const BLOOM_SIZE = 72;
const ANCHOR_LEFT = 39;
const ANCHOR_TOP = 35;
const DEFAULT_DURATION_MS = 500;
const DEFAULT_PEAK_OPACITY = 0.13;
const BLOOM_COLOR = `${Colors.brand700}22`;

type Props = {
  replayKey: number | string;
  duration?: number;
  peakOpacity?: number;
  delay?: number;
  anchorLeft?: number;
  anchorTop?: number;
};

/** Soft radial bloom behind screen content — never overlaps interactive UI. */
export function ScreenEntranceBloom({
  replayKey,
  duration = DEFAULT_DURATION_MS,
  peakOpacity = DEFAULT_PEAK_OPACITY,
  delay = 0,
  anchorLeft = ANCHOR_LEFT,
  anchorTop = ANCHOR_TOP
}: Props) {
  const { reduced } = usePremiumMotion();
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  const maxReach = Math.max(
    Math.hypot(anchorLeft, anchorTop),
    Math.hypot(width - anchorLeft, anchorTop),
    Math.hypot(anchorLeft, height - anchorTop),
    Math.hypot(width - anchorLeft, height - anchorTop)
  );
  const endScale = (maxReach * 2.1) / BLOOM_SIZE;
  const easing = Easing.out(Easing.quad);

  useEffect(() => {
    if (reduced) {
      scale.value = 0.5;
      opacity.value = 0;
      return;
    }

    scale.value = 0.5;
    opacity.value = peakOpacity;

    scale.value = withDelay(delay, withTiming(endScale, { duration, easing }));
    opacity.value = withDelay(delay, withTiming(0, { duration, easing }));
  }, [anchorLeft, anchorTop, delay, duration, easing, endScale, opacity, peakOpacity, reduced, replayKey, scale]);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  if (reduced) {
    return null;
  }

  return (
    <View style={styles.clip} pointerEvents="none">
      <Animated.View
        style={[
          styles.bloom,
          {
            backgroundColor: BLOOM_COLOR,
            height: BLOOM_SIZE,
            left: anchorLeft - BLOOM_SIZE / 2,
            top: anchorTop - BLOOM_SIZE / 2,
            width: BLOOM_SIZE
          },
          bloomStyle
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0
  },
  bloom: {
    borderRadius: BLOOM_SIZE / 2,
    position: "absolute"
  }
});
