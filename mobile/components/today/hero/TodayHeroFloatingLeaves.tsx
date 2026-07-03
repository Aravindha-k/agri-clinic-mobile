import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { usePremiumMotion } from "../../../../src/hooks/usePremiumMotion";

type LeafSpec = {
  id: string;
  left: `${number}%`;
  top: `${number}%`;
  width: number;
  height: number;
  rotate: number;
  delay: number;
};

const LEAVES: LeafSpec[] = [
  { id: "accent", left: "78%", top: "64%", width: 42, height: 52, rotate: -12, delay: 0 },
  { id: "whisper", left: "88%", top: "52%", width: 28, height: 36, rotate: 10, delay: 480 }
];

function FloatingLeaf({ spec }: { spec: LeafSpec }) {
  const { reduced } = usePremiumMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      drift.value = 0;
      return;
    }
    drift.value = withDelay(
      spec.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [drift, reduced, spec.delay]);

  const motion = useAnimatedStyle(() => ({
    opacity: 0.38 + drift.value * 0.08,
    transform: [
      { translateY: -drift.value * 3 },
      { rotate: `${spec.rotate + drift.value * 2}deg` }
    ]
  }));

  return (
    <Animated.View
      style={[
        styles.leaf,
        { left: spec.left, top: spec.top, width: spec.width, height: spec.height },
        motion
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 42 52">
        <Path
          d="M21 4 C30 14 32 30 21 48 C10 30 12 14 21 4 Z"
          fill="#5A9E6E"
          fillOpacity={0.55}
          stroke="#3D7A52"
          strokeWidth={0.6}
          strokeOpacity={0.25}
        />
      </Svg>
    </Animated.View>
  );
}

/** Minimal decorative leaves — low visual weight. */
export function TodayHeroFloatingLeaves() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      {LEAVES.map((spec) => (
        <FloatingLeaf key={spec.id} spec={spec} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1
  },
  leaf: {
    position: "absolute"
  }
});
