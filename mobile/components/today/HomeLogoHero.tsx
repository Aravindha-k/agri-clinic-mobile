import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { AppState, Image, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { LOGO_IMAGE } from "../../../src/config/brand";
import { AgriNatureOrbit } from "../brand/AgriNatureMark";
import {
  TODAY_LOGO_BREATH_HALF_MS,
  TODAY_LOGO_BREATH_MAX,
  TODAY_LOGO_BREATH_MIN,
  TODAY_ORBIT_DURATION_MS,
  measureTodayHeroStage,
  todayOrbitIconSize
} from "./todayHeroLogoSizing";

/** Soft radial glow — capped to canvas, never widens layout. */
const GLOW_MIN = 0.1;
const GLOW_MAX = 0.18;
const GLOW_HALF_MS = 2800;
const BRAND_GREEN = "#0F6B43";

type Props = {
  replayKey?: number | string;
};

/**
 * Today hero orbit canvas — ring + chips + logo share one centre.
 * No negative margins; full canvas fits the left column.
 */
export function HomeLogoHero({ replayKey = 0 }: Props) {
  const { width } = useWindowDimensions();
  const { coreMotion, ready: motionReady, reduced } = usePremiumMotion();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const breath = useSharedValue(1);
  const glow = useSharedValue(coreMotion ? GLOW_MIN : (GLOW_MIN + GLOW_MAX) / 2);

  const measured = useMemo(() => measureTodayHeroStage(width), [width]);
  const orbitDiameter = measured.orbit;
  const logoSize = measured.logo;
  const canvas = measured.canvas;
  const orbitIconSize = todayOrbitIconSize(orbitDiameter, measured.compactChips);
  const logoCanvas = Math.ceil(logoSize * TODAY_LOGO_BREATH_MAX);
  const glowSize = Math.min(canvas, Math.round(orbitDiameter * 1.15));

  const shouldAnimate = motionReady && coreMotion && isFocused && appActive && !reduced;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(glow);
    if (!shouldAnimate) {
      breath.value = 1;
      glow.value = (GLOW_MIN + GLOW_MAX) / 2;
      return;
    }

    breath.value = TODAY_LOGO_BREATH_MIN;
    breath.value = withRepeat(
      withSequence(
        withTiming(TODAY_LOGO_BREATH_MAX, {
          duration: TODAY_LOGO_BREATH_HALF_MS,
          easing: Easing.inOut(Easing.ease)
        }),
        withTiming(TODAY_LOGO_BREATH_MIN, {
          duration: TODAY_LOGO_BREATH_HALF_MS,
          easing: Easing.inOut(Easing.ease)
        })
      ),
      -1,
      false
    );

    glow.value = GLOW_MIN;
    glow.value = withRepeat(
      withSequence(
        withTiming(GLOW_MAX, { duration: GLOW_HALF_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(GLOW_MIN, { duration: GLOW_HALF_MS, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(glow);
    };
  }, [breath, glow, shouldAnimate]);

  void replayKey;

  const logoBreathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value
  }));

  const logoBadge = useMemo(
    () => (
      <View
        style={[styles.logoShell, { width: logoSize, height: logoSize }, styles.logoShadow]}
        accessibilityRole="image"
        accessibilityLabel="Kavya Agri Clinic"
      >
        {LOGO_IMAGE ? (
          <Image
            source={LOGO_IMAGE}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
    ),
    [logoSize]
  );

  const centerLayer = (size: number) => ({
    position: "absolute" as const,
    left: "50%" as const,
    top: "50%" as const,
    width: size,
    height: size,
    marginLeft: -size / 2,
    marginTop: -size / 2
  });

  return (
    <View style={[styles.canvas, { width: canvas, height: canvas }]}>
      {/* Glow — behind, capped to canvas */}
      <Animated.View pointerEvents="none" style={[centerLayer(glowSize), glowStyle, { zIndex: 0 }]}>
        <Svg width={glowSize} height={glowSize}>
          <Defs>
            <RadialGradient id="homeLogoGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={BRAND_GREEN} stopOpacity={0.2} />
              <Stop offset="50%" stopColor={BRAND_GREEN} stopOpacity={0.06} />
              <Stop offset="100%" stopColor={BRAND_GREEN} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill="url(#homeLogoGlow)" />
        </Svg>
      </Animated.View>

      {/* Static ring + rotating icons — chips on track, stage = canvas */}
      <View pointerEvents="none" style={[centerLayer(canvas), { zIndex: 1 }]}>
        <AgriNatureOrbit
          diameter={orbitDiameter}
          animate={shouldAnimate}
          gapRatio={0}
          compact
          chipsOnTrack
          edgePad={measured.edgePad}
          durationMs={TODAY_ORBIT_DURATION_MS}
          iconSizeOverride={orbitIconSize}
          chipPadOverride={measured.chipPad}
        />
      </View>

      {/* Logo — scale-only breathe; shared centre */}
      <View style={[centerLayer(logoCanvas), styles.logoSlot]}>
        {shouldAnimate ? (
          <Animated.View style={[styles.logoBreathWrap, logoBreathStyle]}>{logoBadge}</Animated.View>
        ) : (
          logoBadge
        )}
      </View>
    </View>
  );
}

export function homeLogoHeroColumnWidth(width?: number) {
  return measureTodayHeroStage(width).column;
}

export function homeLogoHeroStageHeight(width?: number) {
  return measureTodayHeroStage(width).canvas;
}

/** Expose gap/inset for BrandHeader Today split. */
export function homeLogoHeroColumnGap(width?: number) {
  return measureTodayHeroStage(width).columnGap;
}

export function homeLogoHeroLeftInset(width?: number) {
  return measureTodayHeroStage(width).leftInset;
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative"
  },
  logoSlot: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    zIndex: 4
  },
  logoBreathWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
  },
  logoShell: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
    overflow: "visible"
  },
  logoShadow: Platform.select({
    ios: {
      shadowColor: "#0F6B43",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8
    },
    default: {
      elevation: 2
    }
  })
});
