import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { AppState, Image, Platform, StyleSheet, View } from "react-native";
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
import { LOGO_IMAGE } from "../../../src/config/brand";
import { AgriNatureMark, AgriNatureOrbit, computeOrbitGap, computeOrbitStageSize } from "../brand/AgriNatureMark";
import {
  BRAND_LOGO_COVER_SCALE,
  BRAND_LOGO_FILL,
  BRAND_LOGO_ZOOM_MAX,
  BRAND_LOGO_ZOOM_MIN,
  BRAND_LOGO_ZOOM_MS,
  BRAND_ORBIT_GAP_RATIO
} from "../brand/brandHeaderSpacing";

/** Home-only hero tuning — does not affect other screens. */
const HOME_LOGO_SIZE = 120;
const HOME_STAGE_PAD = 4;
const GLOW_MIN = 0.18;
const GLOW_MAX = 0.32;
const GLOW_HALF_MS = 2800;
const GLOW_SIZE_RATIO = 1.8;
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
  enabled
}: {
  spec: ParticleSpec;
  trackRadius: number;
  enabled: boolean;
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
    opacity: 0.16,
    transform: [
      { translateX: baseX + drift.value * 2.5 },
      { translateY: baseY - drift.value * 3.5 }
    ]
  }));

  if (!enabled) return null;

  const glyph =
    spec.kind === "seed" ? (
      <MaterialCommunityIcons name="seed-outline" size={7} color={BRAND_GREEN} />
    ) : spec.kind === "pollen" ? (
      <View style={styles.pollen} />
    ) : (
      <Ionicons name="leaf" size={7} color="#2E9B64" />
    );

  return (
    <Animated.View style={[styles.particle, motion]} pointerEvents="none">
      {glyph}
    </Animated.View>
  );
}

/** Today hero — logo zooms in/out inside a fixed orbit band (classic BrandLogoBadge motion). */
export function HomeLogoHero({ replayKey = 0 }: Props) {
  const { coreMotion, ready: motionReady } = usePremiumMotion();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const zoom = useSharedValue(BRAND_LOGO_ZOOM_MIN);
  const glow = useSharedValue(coreMotion ? GLOW_MIN : (GLOW_MIN + GLOW_MAX) / 2);

  const logoVisual = Math.round(HOME_LOGO_SIZE * BRAND_LOGO_FILL);
  const logoCover = Math.round(logoVisual * BRAND_LOGO_COVER_SCALE);
  const outer = logoVisual;
  const orbitGap = computeOrbitGap(outer, BRAND_ORBIT_GAP_RATIO);
  const trackRadius = outer / 2 + orbitGap;
  const orbitStageSize = computeOrbitStageSize(outer, { gapRatio: BRAND_ORBIT_GAP_RATIO, compact: true });
  const stageSize = orbitStageSize + HOME_STAGE_PAD * 2;
  const glowSize = Math.round(outer * GLOW_SIZE_RATIO);
  const shouldZoom = motionReady && coreMotion && isFocused && appActive;
  const showDecorParticles = shouldZoom;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    cancelAnimation(zoom);
    cancelAnimation(glow);
    if (!shouldZoom) {
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
  }, [glow, replayKey, shouldZoom, zoom]);

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
        {LOGO_IMAGE ? (
          <View
            style={[
              styles.logoClip,
              { width: outer, height: outer, borderRadius: outer / 2 }
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
          <AgriNatureMark size={logoVisual} variant="hero" />
        )}
      </View>
    ),
    [logoCover, logoVisual, outer]
  );

  return (
    <View style={[styles.stage, { width: stageSize, height: stageSize }]}>
      <View pointerEvents="none" style={styles.orbitSlot}>
        <AgriNatureOrbit
          diameter={outer}
          animate={shouldZoom}
          showTrack
          minimalTrack
          gapRatio={BRAND_ORBIT_GAP_RATIO}
          compact
        />
      </View>

      <View pointerEvents="none" style={styles.particleOrigin}>
        {ORBIT_PARTICLES.map((spec, index) => (
          <HomeLogoParticle
            key={`${spec.kind}-${index}`}
            spec={spec}
            trackRadius={trackRadius}
            enabled={showDecorParticles}
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
        {shouldZoom ? (
          <Animated.View style={[styles.logoZoomWrap, logoZoomStyle]}>{logoBadge}</Animated.View>
        ) : (
          logoBadge
        )}
      </View>
    </View>
  );
}

/** Column width for split Today header — keeps layout stable. */
export function homeLogoHeroColumnWidth() {
  const logoVisual = Math.round(HOME_LOGO_SIZE * BRAND_LOGO_FILL);
  const orbitStage = computeOrbitStageSize(logoVisual, { gapRatio: BRAND_ORBIT_GAP_RATIO, compact: true });
  return orbitStage + HOME_STAGE_PAD;
}

export function homeLogoHeroStageHeight() {
  const logoVisual = Math.round(HOME_LOGO_SIZE * BRAND_LOGO_FILL);
  const orbitStage = computeOrbitStageSize(logoVisual, { gapRatio: BRAND_ORBIT_GAP_RATIO, compact: true });
  return orbitStage + HOME_STAGE_PAD * 2;
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
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(184, 148, 58, 0.55)",
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden"
  },
  logoClip: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    overflow: "hidden"
  },
  logoShadow: Platform.select({
    ios: {
      shadowColor: "#062818",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 12
    },
    default: {
      elevation: 3
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
    borderRadius: 3,
    height: 5,
    opacity: 0.85,
    width: 5
  }
});
