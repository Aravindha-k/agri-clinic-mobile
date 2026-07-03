import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Grid, Harvest } from "../../lib/designSystem";

const SIZE = 52;

/** Animated sunrise accent for greeting card. */
export function SunriseAccent() {
  const { reduced } = usePremiumMotion();
  const rise = useSharedValue(0);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    if (reduced) {
      rise.value = 1;
      glow.value = 0.4;
      return;
    }
    rise.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    glow.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glow, reduced, rise]);

  const sunStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + glow.value * 0.5,
    transform: [{ translateY: (1 - rise.value) * 8 }]
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={sunStyle}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 52 52">
          <Defs>
            <LinearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FCD34D" stopOpacity={1} />
              <Stop offset="100%" stopColor="#F59E0B" stopOpacity={0.85} />
            </LinearGradient>
          </Defs>
          <Circle cx={26} cy={30} r={14} fill="url(#sunGrad)" opacity={0.9} />
          <Circle cx={26} cy={30} r={20} fill={Harvest.harvest} opacity={0.12} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: SIZE,
    opacity: 0.85,
    position: "absolute",
    right: Grid.xs,
    top: -4,
    width: SIZE
  }
});
