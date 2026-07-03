import { BlurView } from "expo-blur";
import { useEffect } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { LOGO_IMAGE } from "../../../src/config/brand";
import { PremiumShadow } from "../../lib/designSystem";
import { Colors, Shadow } from "../../lib/theme";
import { AgriNatureMark, AgriNatureOrbit } from "./AgriNatureMark";
import { BRAND_LOGO_FILL, BRAND_LOGO_HERO, BrandHeaderSpacing } from "./brandHeaderSpacing";

const FLOAT_MS = 2600;
const GLOW_MS = 3200;
const SHADOW_FLOAT_MS = 3000;
/** Orbit, glow, and glass activate at this diameter and above. */
const LOGO_PREMIUM_MIN = 56;

type Props = {
  size?: number;
  animated?: boolean;
  replayKey?: number | string;
};

/** Glass circular logo with orbit halo and breathing glow. */
export function BrandLogoBadge({
  size = BRAND_LOGO_HERO,
  animated = false,
  replayKey = 0
}: Props) {
  const { reduced } = usePremiumMotion();
  const logoSize = Math.round(size * BRAND_LOGO_FILL);
  const isPremium = size >= LOGO_PREMIUM_MIN;
  const shouldAnimate = animated && isPremium && !reduced;
  const ringPad = isPremium ? 8 : 3;

  const scale = useSharedValue(shouldAnimate ? 0.9 : 1);
  const translateY = useSharedValue(shouldAnimate ? 6 : 0);
  const opacity = useSharedValue(shouldAnimate ? 0 : 1);
  const glow = useSharedValue(0.35);
  const shadowY = useSharedValue(4);

  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      translateY.value = 0;
      opacity.value = 1;
      glow.value = 0.35;
      shadowY.value = 4;
      return;
    }

    scale.value = 0.9;
    translateY.value = 6;
    opacity.value = 0;
    glow.value = 0.35;
    shadowY.value = 4;

    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    translateY.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: FLOAT_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: FLOAT_MS, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    scale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.03, { duration: FLOAT_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: FLOAT_MS, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: GLOW_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.28, { duration: GLOW_MS, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    shadowY.value = withRepeat(
      withSequence(
        withTiming(8, { duration: SHADOW_FLOAT_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: SHADOW_FLOAT_MS, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glow, opacity, replayKey, scale, shadowY, shouldAnimate, translateY]);

  const motionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value
  }));

  const shadowFloatStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + glow.value * 0.08,
    transform: [{ translateY: shadowY.value }]
  }));

  const heroShadow = isPremium ? PremiumShadow.hero : Shadow.cardRaised;
  const outer = size + ringPad * 2;
  const orbitStageSize = size + Math.round(size * 0.95);

  const badge = (
    <View style={[styles.glassShell, { width: outer, height: outer, borderRadius: outer / 2 }, heroShadow]}>
      {isPremium ? (
        <Animated.View
          style={[
            styles.floatShadow,
            { width: outer * 0.7, height: outer * 0.12, borderRadius: outer * 0.06 },
            shadowFloatStyle
          ]}
        />
      ) : null}
      {isPremium ? (
        <Animated.View
          style={[
            styles.glowHalo,
            { width: outer + 16, height: outer + 16, borderRadius: (outer + 16) / 2 },
            glowStyle
          ]}
        />
      ) : null}
      {isPremium && Platform.OS === "ios" ? (
        <BlurView intensity={42} tint="light" style={[styles.blur, { borderRadius: outer / 2 }]} />
      ) : null}
      {isPremium ? (
        <View
          style={[
            styles.gearRing,
            {
              width: outer + 10,
              height: outer + 10,
              borderRadius: (outer + 10) / 2
            }
          ]}
        />
      ) : null}
      <View
        style={[
          styles.badge,
          isPremium && styles.badgeHero,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isPremium ? "rgba(255,255,255,0.94)" : Colors.surface
          }
        ]}
      >
        {LOGO_IMAGE ? (
          <Image
            source={LOGO_IMAGE}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <AgriNatureMark size={logoSize} variant="hero" />
        )}
      </View>
    </View>
  );

  const core = (
    <View
      style={[
        styles.stage,
        isPremium && {
          minWidth: orbitStageSize,
          minHeight: orbitStageSize,
          paddingHorizontal: BrandHeaderSpacing.logoStageHorizontal,
          paddingVertical: BrandHeaderSpacing.logoStageVertical
        }
      ]}
    >
      {isPremium ? <AgriNatureOrbit diameter={size} animate={!reduced} showTrack /> : null}
      <View style={styles.badgeLayer}>{badge}</View>
    </View>
  );

  return shouldAnimate ? <Animated.View style={motionStyle}>{core}</Animated.View> : core;
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
  },
  badgeLayer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  glassShell: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.85)",
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden"
  },
  gearRing: {
    borderColor: "rgba(255,255,255,0.95)",
    borderWidth: 3,
    position: "absolute",
    zIndex: -1
  },
  blur: {
    ...StyleSheet.absoluteFillObject
  },
  glowHalo: {
    backgroundColor: "rgba(46, 155, 100, 0.32)",
    position: "absolute",
    zIndex: -1
  },
  badge: {
    alignItems: "center",
    borderColor: "rgba(15, 107, 67, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
    ...Platform.select({
      android: { elevation: 3 }
    })
  },
  badgeHero: {
    borderColor: "rgba(15, 107, 67, 0.22)",
    borderWidth: 1.5
  },
  floatShadow: {
    backgroundColor: "#0B3D28",
    bottom: -8,
    position: "absolute",
    zIndex: -2
  }
});
