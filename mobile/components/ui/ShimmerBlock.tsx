import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { Harvest, PremiumRadius } from "../../lib/designSystem";

type Props = {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** Shimmer skeleton block — replaces flat pulse loaders. */
export function ShimmerBlock({ width, height, borderRadius = PremiumRadius.sm, style }: Props) {
  const shift = useSharedValue(-1);

  useEffect(() => {
    shift.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );
  }, [shift]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * 120 }]
  }));

  return (
    <View
      style={[
        styles.base,
        { width, height, borderRadius, backgroundColor: Harvest.cardMuted },
        style
      ]}
    >
      <Animated.View style={[styles.shimmerTrack, shimmerStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden"
  },
  shimmerTrack: {
    ...StyleSheet.absoluteFillObject,
    width: "200%"
  },
  shimmerGradient: {
    flex: 1
  }
});
