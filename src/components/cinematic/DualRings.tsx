import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  size?: number;
  innerColor?: string;
  outerColor?: string;
};

export default function DualRings({
  size = 130,
  innerColor = "#22c55e",
  outerColor = "rgba(76,175,130,0.15)"
}: Props) {
  const { enabled } = usePremiumMotion();
  const rot1 = useRef(new Animated.Value(0)).current;
  const rot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) return;
    const l1 = Animated.loop(
      Animated.timing(rot1, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
    );
    const l2 = Animated.loop(
      Animated.timing(rot2, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true })
    );
    l1.start();
    l2.start();
    return () => {
      l1.stop();
      l2.stop();
      rot1.stopAnimation();
      rot2.stopAnimation();
    };
  }, [enabled, rot1, rot2]);

  const spin1 = rot1.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const spin2 = rot2.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] });

  const cx = size / 2;
  const r1 = size / 2 - 4;
  const r2 = size / 2 + 12;
  const circ1 = 2 * Math.PI * r1;
  const circ2 = 2 * Math.PI * r2;

  if (!enabled) {
    return (
      <View style={[styles.wrap, { width: size + 24, height: size + 24 }]}>
        <Svg width={size + 24} height={size + 24} style={StyleSheet.absoluteFill}>
          <Circle cx={cx + 12} cy={cx + 12} r={r1} stroke={innerColor} strokeWidth={1.5} fill="none" opacity={0.4} />
        </Svg>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size + 24, height: size + 24 }]}>
      <Animated.View style={[styles.ring, { transform: [{ rotate: spin1 }] }]}>
        <Svg width={size + 24} height={size + 24}>
          <Circle
            cx={cx + 12}
            cy={cx + 12}
            r={r1}
            stroke={innerColor}
            strokeWidth={2}
            strokeDasharray={`${circ1 * 0.25} ${circ1 * 0.75}`}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.ring, { transform: [{ rotate: spin2 }] }]}>
        <Svg width={size + 24} height={size + 24}>
          <Circle
            cx={cx + 12}
            cy={cx + 12}
            r={r2}
            stroke={outerColor}
            strokeWidth={1}
            strokeDasharray={`${circ2 * 0.15} ${circ2 * 0.85}`}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  }
});
