import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Harvest } from "../../lib/designSystem";
import { AppIcon } from "./AppIcon";

type Props = {
  code?: number;
};

/** Living weather micro-scene — sun, cloud drift, wind, droplet. */
export function AnimatedWeatherScene({ code = 1 }: Props) {
  const { reduced, enabled } = usePremiumMotion();
  const cloudX = useSharedValue(0);
  const sunPulse = useSharedValue(1);
  const windShift = useSharedValue(0);
  const dropY = useSharedValue(0);

  const isRainy = code >= 51;
  const isClear = code === 0;
  const isCloudy = code >= 1 && code <= 3;

  useEffect(() => {
    if (reduced || !enabled) return;
    cloudX.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-2, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    sunPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    windShift.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    dropY.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [cloudX, dropY, enabled, reduced, sunPulse, windShift]);

  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudX.value }]
  }));
  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sunPulse.value }]
  }));
  const windStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + windShift.value * 0.35,
    transform: [{ translateX: windShift.value * 2 }]
  }));
  const dropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dropY.value }]
  }));

  if (reduced || !enabled) {
    return (
      <View style={styles.stage}>
        <AppIcon name={isClear ? "sun" : isRainy ? "cloud-rain" : "cloud-sun"} size={22} color={Harvest.sky} />
      </View>
    );
  }

  return (
    <View style={styles.stage}>
      {(isClear || isCloudy) && (
        <Animated.View style={[styles.sun, sunStyle]}>
          <AppIcon name="sun" size={18} color="#F59E0B" />
        </Animated.View>
      )}
      {(isCloudy || isRainy) && (
        <Animated.View style={[styles.cloud, cloudStyle]}>
          <AppIcon name="cloud" size={20} color={Harvest.sky} />
        </Animated.View>
      )}
      <Animated.View style={[styles.wind, windStyle]}>
        <AppIcon name="wind" size={12} color={Harvest.textMuted} />
      </Animated.View>
      <Animated.View style={[styles.drop, dropStyle]}>
        <AppIcon name="droplets" size={12} color={Harvest.sky} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 44
  },
  sun: {
    left: 2,
    position: "absolute",
    top: 2
  },
  cloud: {
    position: "absolute",
    right: 0,
    top: 4
  },
  wind: {
    bottom: 0,
    left: 0,
    position: "absolute"
  },
  drop: {
    bottom: 0,
    position: "absolute",
    right: 6
  }
});
