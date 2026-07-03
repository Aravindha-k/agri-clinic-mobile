import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Grid } from "../../lib/designSystem";

type Props = {
  borderRadius?: number;
};

/** Subtle moving glass highlight across cards. */
export function GlassSheen({ borderRadius = 24 }: Props) {
  const { reduced } = usePremiumMotion();
  const shift = useSharedValue(-1);

  useEffect(() => {
    if (reduced) return;
    shift.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [reduced, shift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * 180 }, { rotate: "18deg" }]
  }));

  if (reduced) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius, overflow: "hidden" }]} pointerEvents="none">
      <Animated.View style={[styles.sheen, style]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.22)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheen: {
    height: "200%",
    left: -80,
    position: "absolute",
    top: -40,
    width: 100
  },
  gradient: {
    flex: 1
  }
});
