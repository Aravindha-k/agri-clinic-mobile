import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";
import { BRAND_COLORS } from "../../src/config/brand";
import { usePremiumMotion } from "../../src/hooks/usePremiumMotion";
import { SEED_GROW_TIMING } from "./seedGrowTiming";

type Props = {
  size?: "xs" | "sm" | "md" | "lg";
  style?: ViewStyle;
};

const SIZES = {
  xs: { stage: 40, soil: 34, seedW: 36, seedH: 28, sproutW: 22, sproutH: 26, sproutBottom: 8 },
  sm: { stage: 56, soil: 48, seedW: 48, seedH: 38, sproutW: 28, sproutH: 34, sproutBottom: 10 },
  md: { stage: 88, soil: 72, seedW: 72, seedH: 56, sproutW: 40, sproutH: 48, sproutBottom: 18 },
  lg: { stage: 108, soil: 88, seedW: 88, seedH: 68, sproutW: 48, sproutH: 56, sproutBottom: 22 }
} as const;

/** Seed-in-soil sprout grow loop — shared by headers, loaders, and screen badges. */
export function SeedGrowMark({ size = "md", style }: Props) {
  const dims = SIZES[size];
  const seedPulse = useRef(new Animated.Value(1)).current;
  const sproutGrow = useRef(new Animated.Value(0)).current;
  const sproutSway = useRef(new Animated.Value(0)).current;
  const soilGlow = useRef(new Animated.Value(0.35)).current;
  const { reduced } = usePremiumMotion();
  const T = SEED_GROW_TIMING;

  useEffect(() => {
    if (reduced) {
      seedPulse.setValue(1);
      sproutGrow.setValue(0.75);
      soilGlow.setValue(0.45);
      return;
    }

    const seedLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(seedPulse, {
          toValue: 1.05,
          duration: T.seedPulseHalfMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(seedPulse, {
          toValue: 0.96,
          duration: T.seedPulseHalfMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    const growLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sproutGrow, {
          toValue: 1,
          duration: T.growUpMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(sproutGrow, {
          toValue: 0.12,
          duration: T.growDownMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sproutSway, {
          toValue: 1,
          duration: T.swayHalfMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(sproutSway, {
          toValue: -1,
          duration: T.swayHalfMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(soilGlow, { toValue: 0.62, duration: T.glowHalfMs, useNativeDriver: true }),
        Animated.timing(soilGlow, { toValue: 0.32, duration: T.glowHalfMs, useNativeDriver: true })
      ])
    );

    seedLoop.start();
    growLoop.start();
    swayLoop.start();
    glowLoop.start();
    return () => {
      seedLoop.stop();
      growLoop.stop();
      swayLoop.stop();
      glowLoop.stop();
    };
  }, [T.glowHalfMs, T.growDownMs, T.growUpMs, T.seedPulseHalfMs, T.swayHalfMs, reduced, seedPulse, soilGlow, sproutGrow, sproutSway]);

  const sproutScale = sproutGrow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] });
  const sproutRotate = sproutSway.interpolate({ inputRange: [-1, 1], outputRange: ["-6deg", "6deg"] });

  return (
    <View style={[styles.stage, { height: dims.stage, width: dims.stage }, style]}>
      <Animated.View
        style={[
          styles.soilRing,
          {
            opacity: soilGlow,
            width: dims.soil,
            height: dims.soil,
            borderRadius: dims.soil / 2
          }
        ]}
      />
      <Animated.View style={{ transform: [{ scale: seedPulse }] }}>
        <Svg width={dims.seedW} height={dims.seedH} viewBox="0 0 72 56">
          <Ellipse cx={36} cy={38} rx={22} ry={14} fill="#8B6914" opacity={0.92} />
          <Ellipse cx={36} cy={36} rx={20} ry={12} fill="#A67C00" />
          <Ellipse cx={30} cy={34} rx={6} ry={3} fill="#C9A227" opacity={0.45} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.sprout,
          {
            bottom: dims.sproutBottom,
            opacity: sproutGrow,
            transform: [{ scaleY: sproutScale }, { rotate: sproutRotate }]
          }
        ]}
      >
        <Svg width={dims.sproutW} height={dims.sproutH} viewBox="0 0 40 48">
          <Path d="M20 44V22" stroke={BRAND_COLORS.primary} strokeWidth={2.5} strokeLinecap="round" />
          <Path
            d="M20 26C14 22 8 18 6 12C12 16 17 20 20 26Z"
            fill={BRAND_COLORS.primary}
            opacity={0.9}
          />
          <Path
            d="M20 20C26 16 32 12 34 8C28 14 23 17 20 20Z"
            fill={BRAND_COLORS.secondary}
            opacity={0.85}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "flex-end"
  },
  soilRing: {
    backgroundColor: BRAND_COLORS.primarySoft,
    bottom: 0,
    position: "absolute"
  },
  sprout: {
    position: "absolute"
  }
});
