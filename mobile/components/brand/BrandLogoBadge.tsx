import { useEffect } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { LOGO_IMAGE } from "../../../src/config/brand";
import { PremiumShadow } from "../../lib/designSystem";
import { Shadow } from "../../lib/theme";
import {
  AgriNatureMark,
  AgriNatureOrbit,
  computeOrbitGap,
  computeOrbitStageSize
} from "./AgriNatureMark";
import {
  BRAND_LOGO_COVER_SCALE,
  BRAND_LOGO_FILL,
  BRAND_LOGO_HERO,
  BRAND_LOGO_ZOOM_MAX,
  BRAND_LOGO_ZOOM_MIN,
  BRAND_LOGO_ZOOM_MS,
  BRAND_ORBIT_GAP_RATIO,
  BrandHeaderSpacing
} from "./brandHeaderSpacing";

/** Orbit + glass activate at this diameter and above. */
const LOGO_PREMIUM_MIN = 56;
const PROFILE_ORBIT_DURATION_MS = 10_000;

type Props = {
  size?: number;
  animated?: boolean;
  replayKey?: number | string;
  showOrbit?: boolean;
  /** Pin orbit + badge to the left edge of the header column. */
  alignLeft?: boolean;
  motionPreset?: "default" | "profile";
};

/**
 * Circular brand logo with service icons orbiting around it.
 * Logo zooms in/out inside the orbit; the orbit band stays fixed.
 */
export function BrandLogoBadge({
  size = BRAND_LOGO_HERO,
  animated = false,
  replayKey = 0,
  showOrbit = true,
  alignLeft = false,
  motionPreset = "default"
}: Props) {
  const { coreMotion } = usePremiumMotion();
  const isPremium = size >= LOGO_PREMIUM_MIN;
  const logoVisual = Math.round(size * BRAND_LOGO_FILL);
  const logoSize = logoVisual;
  const logoCover = Math.round(logoVisual * BRAND_LOGO_COVER_SCALE);
  const shouldOrbit = showOrbit && isPremium;
  const shouldZoom = animated && isPremium && coreMotion;
  const ringPad = isPremium ? 0 : 3;
  const outer = isPremium ? logoVisual : size + ringPad * 2;
  const orbitShiftLeft = Math.round(computeOrbitGap(logoVisual));

  const zoom = useSharedValue(BRAND_LOGO_ZOOM_MIN);

  useEffect(() => {
    if (!shouldZoom) {
      zoom.value = 1;
      return;
    }

    if (motionPreset === "profile") {
      zoom.value = 0.92;
      zoom.value = withSequence(
        withTiming(1.05, {
          duration: 700,
          easing: Easing.out(Easing.cubic)
        }),
        withTiming(1, {
          duration: 420,
          easing: Easing.inOut(Easing.ease)
        }),
        withRepeat(
          withSequence(
            withTiming(1.04, {
              duration: 2200,
              easing: Easing.inOut(Easing.ease)
            }),
            withTiming(0.98, {
              duration: 2200,
              easing: Easing.inOut(Easing.ease)
            })
          ),
          -1,
          true
        )
      );
      return;
    }

    zoom.value = BRAND_LOGO_ZOOM_MIN;
    zoom.value = withRepeat(
      withSequence(
        withTiming(BRAND_LOGO_ZOOM_MAX, {
          duration: BRAND_LOGO_ZOOM_MS,
          easing: Easing.inOut(Easing.ease)
        }),
        withTiming(BRAND_LOGO_ZOOM_MIN, {
          duration: BRAND_LOGO_ZOOM_MS,
          easing: Easing.inOut(Easing.ease)
        })
      ),
      -1,
      false
    );
  }, [motionPreset, replayKey, shouldZoom, zoom]);

  const logoZoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }]
  }));

  const heroShadow = isPremium ? PremiumShadow.hero : Shadow.cardRaised;
  const orbitStageSize = computeOrbitStageSize(outer, { gapRatio: BRAND_ORBIT_GAP_RATIO, compact: true });
  const stagePadH = BrandHeaderSpacing.logoStageHorizontal;
  const stagePadV = BrandHeaderSpacing.logoStageVertical;
  const stageWidth = orbitStageSize + (alignLeft ? stagePadH : stagePadH * 2);
  const stageHeight = orbitStageSize + stagePadV * 2;

  const badge = (
    <View
      style={[
        styles.glassShell,
        { width: outer, height: outer, borderRadius: outer / 2 },
        heroShadow
      ]}
    >
      {LOGO_IMAGE ? (
        <View
          style={[
            styles.logoClip,
            {
              width: outer,
              height: outer,
              borderRadius: outer / 2
            }
          ]}
        >
          <Image
            source={LOGO_IMAGE}
            style={{ width: logoCover, height: logoCover }}
            resizeMode="cover"
            accessibilityLabel="Kavya Agri Clinic"
            accessibilityIgnoresInvertColors
          />
        </View>
      ) : (
        <View
          style={[
            styles.badge,
            isPremium && styles.badgeHero,
            {
              width: size,
              height: size,
              borderRadius: size / 2
            }
          ]}
        >
          <AgriNatureMark size={logoSize} variant="hero" />
        </View>
      )}
    </View>
  );

  const logoMark = shouldZoom ? (
    <Animated.View style={[styles.logoZoomWrap, logoZoomStyle]}>{badge}</Animated.View>
  ) : (
    badge
  );

  const core = (
    <View
      style={[
        styles.stage,
        shouldOrbit && {
          width: stageWidth,
          height: stageHeight,
          alignSelf: alignLeft ? "flex-start" : "center",
          marginLeft: alignLeft ? -orbitShiftLeft : 0,
          paddingLeft: alignLeft ? 0 : stagePadH,
          paddingRight: stagePadH,
          paddingVertical: stagePadV
        }
      ]}
    >
      {shouldOrbit ? (
        <View pointerEvents="none" style={styles.orbitSlot}>
          <AgriNatureOrbit
            diameter={outer}
            animate={animated && coreMotion}
            showTrack
            gapRatio={BRAND_ORBIT_GAP_RATIO}
            compact
            durationMs={motionPreset === "profile" ? PROFILE_ORBIT_DURATION_MS : undefined}
          />
        </View>
      ) : null}
      <View style={styles.badgeLayer}>{logoMark}</View>
    </View>
  );

  return core;
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative"
  },
  orbitSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    zIndex: 1
  },
  badgeLayer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  logoZoomWrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  glassShell: {
    alignItems: "center",
    backgroundColor: "#E8F3EC",
    borderColor: "rgba(15, 107, 67, 0.28)",
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative"
  },
  logoClip: {
    alignItems: "center",
    backgroundColor: "#E8F3EC",
    justifyContent: "center",
    overflow: "hidden"
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#E8F3EC",
    borderColor: "rgba(15, 107, 67, 0.2)",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
    ...Platform.select({
      android: { elevation: 8 }
    })
  },
  badgeHero: {
    borderColor: "rgba(15, 107, 67, 0.32)",
    borderWidth: 1.5
  }
});
