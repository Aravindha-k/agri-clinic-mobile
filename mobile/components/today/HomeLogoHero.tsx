import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { AppState, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { CompanyLogo } from "../../../src/components/brand/CompanyLogo";
import { AgriNatureOrbit, computeOrbitGap, computeOrbitStageSize } from "../brand/AgriNatureMark";
import {
  BRAND_LOGO_FILL,
  BRAND_LOGO_ZOOM_MAX,
  BRAND_LOGO_ZOOM_MIN,
  BRAND_LOGO_ZOOM_MS
} from "../brand/brandHeaderSpacing";
import {
  TODAY_ORBIT_DURATION_MS,
  measureTodayHeroStage,
  todayHeroLogoSize,
  todayHeroOrbitGapRatio,
  todayOrbitIconSize
} from "./todayHeroLogoSizing";

/** Home-only hero tuning — does not affect other screens. */
const HOME_STAGE_PAD = 6;
const GLOW_MIN = 0.18;
const GLOW_MAX = 0.32;
const GLOW_HALF_MS = 2800;
const GLOW_SIZE_RATIO = 1.75;
const BRAND_GREEN = "#0F6B43";

type ParticleSpec = {
  angle: number;
  orbitFactor: number;
  driftMs: number;
  kind: "leaf" | "seed" | "pollen";
};

const ORBIT_PARTICLES: ParticleSpec[] = [
  { angle: 0.55, orbitFactor: 1.08, driftMs: 0, kind: "leaf" },
  { angle: 2.1, orbitFactor: 1.12, driftMs: 900, kind: "seed" },
  { angle: 3.65, orbitFactor: 1.06, driftMs: 1800, kind: "pollen" },
  { angle: 5.2, orbitFactor: 1.14, driftMs: 400, kind: "leaf" }
];

type Props = {
  replayKey?: number | string;
};

function HomeLogoParticle({
  spec,
  trackRadius,
  enabled,
  glyphSize
}: {
  spec: ParticleSpec;
  trackRadius: number;
  enabled: boolean;
  glyphSize: number;
}) {
  const drift = useSharedValue(0);
  const radius = trackRadius * spec.orbitFactor;
  const baseX = Math.cos(spec.angle) * radius;
  const baseY = Math.sin(spec.angle) * radius;

  useEffect(() => {
    cancelAnimation(drift);
    if (!enabled) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5200 + spec.driftMs, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5200 + spec.driftMs, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(drift);
  }, [drift, enabled, spec.driftMs]);

  const motion = useAnimatedStyle(() => ({
    opacity: 0.22,
    transform: [
      { translateX: baseX + drift.value * 2.5 },
      { translateY: baseY - drift.value * 3.5 }
    ]
  }));

  if (!enabled) return null;

  const glyph =
    spec.kind === "seed" ? (
      <MaterialCommunityIcons name="seed-outline" size={glyphSize} color={BRAND_GREEN} />
    ) : spec.kind === "pollen" ? (
      <View style={[styles.pollen, { width: glyphSize - 2, height: glyphSize - 2, borderRadius: (glyphSize - 2) / 2 }]} />
    ) : (
      <Ionicons name="leaf" size={glyphSize} color="#2E9B64" />
    );

  return (
    <Animated.View style={[styles.particle, motion]} pointerEvents="none">
      {glyph}
    </Animated.View>
  );
}

/** Today hero — larger responsive logo + continuously rotating orbit icons. */
export function HomeLogoHero({ replayKey = 0 }: Props) {
  const { width } = useWindowDimensions();
  const { coreMotion, ready: motionReady, reduced } = usePremiumMotion();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const zoom = useSharedValue(BRAND_LOGO_ZOOM_MIN);
  const glow = useSharedValue(coreMotion ? GLOW_MIN : (GLOW_MIN + GLOW_MAX) / 2);

  const homeLogoSize = todayHeroLogoSize(width);
  const logoVisual = Math.round(homeLogoSize * BRAND_LOGO_FILL);
  const outer = logoVisual;
  const orbitIconSize = todayOrbitIconSize(outer);
  const orbitGapRatio = todayHeroOrbitGapRatio(width);
  const orbitGap = computeOrbitGap(outer, orbitGapRatio);
  const trackRadius = outer / 2 + orbitGap;
  const orbitStageSize = computeOrbitStageSize(outer, { gapRatio: orbitGapRatio, compact: true });
  const stageSize = orbitStageSize + HOME_STAGE_PAD * 2;
  const glowSize = Math.round(outer * GLOW_SIZE_RATIO);

  // Orbit + logo zoom run whenever reduce-motion is off and the screen is active.
  // Do not require heavyEffects (battery saver) — orbit is core branding motion.
  const shouldAnimate = motionReady && coreMotion && isFocused && appActive && !reduced;
  const showDecorParticles = shouldAnimate;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    cancelAnimation(zoom);
    cancelAnimation(glow);
    if (!shouldAnimate) {
      zoom.value = 1;
      glow.value = (GLOW_MIN + GLOW_MAX) / 2;
      return;
    }

    zoom.value = 0.88;
    zoom.value = withSequence(
      withTiming(1.04, {
        duration: 620,
        easing: Easing.out(Easing.cubic)
      }),
      withTiming(1, {
        duration: 380,
        easing: Easing.inOut(Easing.ease)
      }),
      withRepeat(
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
      )
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
      cancelAnimation(zoom);
      cancelAnimation(glow);
    };
  }, [glow, replayKey, shouldAnimate, zoom]);

  const logoZoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value
  }));

  const logoBadge = useMemo(
    () => (
      <View
        style={[
          styles.logoShell,
          { width: outer, height: outer, borderRadius: outer / 2 },
          styles.logoShadow
        ]}
      >
        <View
          style={[
            styles.logoClip,
            { width: outer, height: outer, borderRadius: outer / 2, backgroundColor: "transparent" }
          ]}
        >
          <CompanyLogo size={outer} accessibilityLabel="Kavya Agri Clinic" />
        </View>
      </View>
    ),
    [outer]
  );

  const particleGlyph = Math.max(8, Math.round(orbitIconSize * 0.35));

  return (
    <View style={[styles.stage, { width: stageSize, height: stageSize }]}>
      <View pointerEvents="none" style={styles.orbitSlot}>
        <AgriNatureOrbit
          diameter={outer}
          animate={shouldAnimate}
          showTrack
          minimalTrack
          gapRatio={orbitGapRatio}
          compact
          durationMs={TODAY_ORBIT_DURATION_MS}
          iconSizeOverride={orbitIconSize}
        />
      </View>

      <View pointerEvents="none" style={styles.particleOrigin}>
        {ORBIT_PARTICLES.map((spec, index) => (
          <HomeLogoParticle
            key={`${spec.kind}-${index}`}
            spec={spec}
            trackRadius={trackRadius}
            enabled={showDecorParticles}
            glyphSize={particleGlyph}
          />
        ))}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowSlot,
          glowStyle,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            marginLeft: -glowSize / 2,
            marginTop: -glowSize / 2
          }
        ]}
      >
        <Svg width={glowSize} height={glowSize}>
          <Defs>
            <RadialGradient id="homeLogoGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={BRAND_GREEN} stopOpacity={0.55} />
              <Stop offset="55%" stopColor={BRAND_GREEN} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={BRAND_GREEN} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill="url(#homeLogoGlow)" />
        </Svg>
      </Animated.View>

      <View style={styles.logoSlot}>
        {shouldAnimate ? (
          <Animated.View style={[styles.logoZoomWrap, logoZoomStyle]}>{logoBadge}</Animated.View>
        ) : (
          logoBadge
        )}
      </View>
    </View>
  );
}

/** Column width for split Today header — keeps layout stable across phone widths. */
export function homeLogoHeroColumnWidth(width?: number) {
  return measureTodayHeroStage(width).column;
}

export function homeLogoHeroStageHeight(width?: number) {
  return measureTodayHeroStage(width).stage + HOME_STAGE_PAD * 2;
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
    zIndex: 1
  },
  glowSlot: {
    left: "50%",
    position: "absolute",
    top: "50%",
    zIndex: 2
  },
  logoSlot: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4
  },
  logoZoomWrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  particleOrigin: {
    alignItems: "center",
    height: 0,
    justifyContent: "center",
    left: "50%",
    position: "absolute",
    top: "50%",
    width: 0,
    zIndex: 3
  },
  logoShell: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "rgba(15, 107, 67, 0.18)",
    borderWidth: 1.5,
    justifyContent: "center",
    overflow: "hidden"
  },
  logoClip: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
    overflow: "hidden"
  },
  logoShadow: Platform.select({
    ios: {
      shadowColor: "#062818",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14
    },
    default: {
      elevation: 6
    }
  }),
  particle: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    zIndex: 3
  },
  pollen: {
    backgroundColor: "#B8D9C8",
    opacity: 0.85
  }
});
