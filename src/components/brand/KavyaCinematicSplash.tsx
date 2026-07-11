import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, InteractionManager, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { BRAND } from "../../config/brand";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";
import { logStartup } from "../../utils/startupDiagnostics";
import { SplashGoldenParticles } from "./SplashGoldenParticles";
import { SplashLogoOrbit } from "./SplashLogoOrbit";
import { SPLASH_ASSETS } from "./splashAssets";
import {
  CINEMATIC_SPLASH_BG,
  SPLASH_EXIT_FADE_MS,
  SPLASH_EXIT_WASH,
  SPLASH_MAX_VISIBLE_MS,
  SPLASH_MIN_VISIBLE_MS
} from "./splashColors";

/** Match Expo splash plugin imageWidth (~200 logical px). */
const LOGO_WIDTH_RATIO = 0.42;
const LOGO_MAX = 200;

/**
 * Timeline from first layout (ms):
 * 0–300     static first frame (= native: solid blue + centered logo)
 * 300–1100  soft field background fade + logo rise
 * 450–1200  title / subtitle reveal
 * then hold until canExit ∧ min duration
 * exit fade ~320 ms
 */
const STATIC_HOLD_MS = 300;
const BG_FADE_MS = 700;
const LOGO_ANIM_MS = 780;
const TITLE_START_MS = 480;
const TITLE_ANIM_MS = 560;
const SUBTITLE_START_MS = 720;
const SUBTITLE_ANIM_MS = 500;
const BLOOM_START_MS = 650;
const BLOOM_ANIM_MS = 750;

type Props = {
  onFinish: () => void;
  /** Called once after first layout + animation start — hide native splash here. */
  onReady?: () => void;
  /** Called when exit fade begins so the app shell can show under the fade. */
  onExitStart?: () => void;
  /**
   * When true, splash may begin exit after the minimum animation timeline.
   * Gate on critical startup (auth + fonts), not dashboard APIs.
   */
  canExit?: boolean;
};

/**
 * Continuous splash: first frame matches native (solid bg + centered logo),
 * then a clearly visible cinematic beat, then exit when ready.
 */
export function KavyaCinematicSplash({ onFinish, onReady, onExitStart, canExit = false }: Props) {
  const { reduced, enabled } = usePremiumMotion();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layoutAtRef = useRef<number | null>(null);
  const readyNotifiedRef = useRef(false);
  const exitStartedRef = useRef(false);
  const finishedRef = useRef(false);
  const animationFloorDoneRef = useRef(false);
  const animationStartedRef = useRef(false);
  const canExitRef = useRef(canExit);
  const onReadyRef = useRef(onReady);
  const onExitStartRef = useRef(onExitStart);
  const onFinishRef = useRef(onFinish);
  const [layoutReady, setLayoutReady] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  canExitRef.current = canExit;
  onReadyRef.current = onReady;
  onExitStartRef.current = onExitStart;
  onFinishRef.current = onFinish;

  const bgOpacity = useSharedValue(0);
  const bgScale = useSharedValue(1.04);
  const logoOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const logoTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(14);
  const subtitleOpacity = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.85);
  const exitWash = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const logoSize = useMemo(() => {
    const shortEdge = Math.min(screenW, screenH);
    return Math.min(screenW * LOGO_WIDTH_RATIO, LOGO_MAX, shortEdge * 0.45);
  }, [screenH, screenW]);

  const bloomSize = useMemo(() => logoSize * 1.5, [logoSize]);
  /** Orbit stage larger than logo so the ring is not clipped by the mark. */
  const orbitSize = useMemo(() => Math.round(logoSize * 1.48), [logoSize]);

  const center = useMemo(
    () => ({
      left: (screenW - logoSize) / 2,
      top: (screenH - logoSize) / 2 - screenH * 0.06
    }),
    [logoSize, screenH, screenW]
  );

  const bloomCenter = useMemo(
    () => ({
      left: (screenW - bloomSize) / 2,
      top: center.top + (logoSize - bloomSize) / 2
    }),
    [bloomSize, center.top, logoSize, screenW]
  );

  const orbitCenter = useMemo(
    () => ({
      left: (screenW - orbitSize) / 2,
      top: center.top + (logoSize - orbitSize) / 2
    }),
    [center.top, logoSize, orbitSize, screenW]
  );

  const elapsed = useCallback(() => {
    const start = layoutAtRef.current ?? Date.now();
    return Math.max(0, Date.now() - start);
  }, []);

  const finishSplash = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    logStartup("cinematic_finished", `${elapsed()} ms`);
    onFinishRef.current();
  }, [elapsed]);

  const beginExit = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    logStartup("cinematic_exit_started", `${elapsed()} ms`);
    logStartup("cinematic_exit_start", `${elapsed()} ms`);
    onExitStartRef.current?.();

    const easeInOut = Easing.inOut(Easing.cubic);
    exitWash.value = withTiming(1, { duration: SPLASH_EXIT_FADE_MS, easing: easeInOut });
    screenOpacity.value = withTiming(0, { duration: SPLASH_EXIT_FADE_MS, easing: easeInOut }, (done) => {
      if (done) {
        runOnJS(finishSplash)();
      }
    });
  }, [elapsed, exitWash, finishSplash, screenOpacity]);

  const tryExit = useCallback(() => {
    if (exitStartedRef.current || finishedRef.current) return;
    if (!animationFloorDoneRef.current) return;
    if (!canExitRef.current) return;
    beginExit();
  }, [beginExit]);

  const tryExitRef = useRef(tryExit);
  tryExitRef.current = tryExit;
  const beginExitRef = useRef(beginExit);
  beginExitRef.current = beginExit;
  const finishSplashRef = useRef(finishSplash);
  finishSplashRef.current = finishSplash;

  useEffect(() => {
    logStartup("cinematic_component_rendered", "0 ms");
  }, []);

  const onFirstLayout = useCallback(() => {
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    layoutAtRef.current = Date.now();
    logStartup("cinematic_first_layout", "0 ms");
    setLayoutReady(true);
  }, []);

  const preferLightRef = useRef(false);
  preferLightRef.current = reduced || !enabled;

  useEffect(() => {
    if (!layoutReady || animationStartedRef.current) return;
    animationStartedRef.current = true;

    const easeOut = Easing.out(Easing.cubic);
    const easeInOut = Easing.inOut(Easing.cubic);
    const preferLight = preferLightRef.current;
    const minMs = preferLight ? Math.min(1600, SPLASH_MIN_VISIBLE_MS) : SPLASH_MIN_VISIBLE_MS;

    cancelAnimation(bgOpacity);
    cancelAnimation(bgScale);
    cancelAnimation(logoOpacity);
    cancelAnimation(logoScale);
    cancelAnimation(logoTranslateY);
    cancelAnimation(titleOpacity);
    cancelAnimation(titleTranslateY);
    cancelAnimation(subtitleOpacity);
    cancelAnimation(bloomOpacity);
    cancelAnimation(bloomScale);
    cancelAnimation(exitWash);
    cancelAnimation(screenOpacity);

    // Native-matching first frame.
    bgOpacity.value = 0;
    bgScale.value = 1.04;
    logoOpacity.value = 1;
    logoScale.value = 1;
    logoTranslateY.value = 0;
    titleOpacity.value = 0;
    titleTranslateY.value = 14;
    subtitleOpacity.value = 0;
    bloomOpacity.value = 0;
    bloomScale.value = 0.85;
    exitWash.value = 0;
    screenOpacity.value = 1;

    // Soft field backdrop — visibly different from static native splash after the hold.
    if (!bgFailed) {
      bgOpacity.value = withDelay(
        STATIC_HOLD_MS,
        withTiming(preferLight ? 0.55 : 0.82, { duration: BG_FADE_MS, easing: easeOut })
      );
      bgScale.value = withDelay(
        STATIC_HOLD_MS,
        withTiming(1, { duration: SPLASH_MIN_VISIBLE_MS, easing: easeInOut })
      );
    }

    logoScale.value = withDelay(
      STATIC_HOLD_MS,
      withTiming(preferLight ? 1.05 : 1.1, { duration: LOGO_ANIM_MS, easing: easeOut })
    );
    logoTranslateY.value = withDelay(
      STATIC_HOLD_MS,
      withSequence(
        withTiming(preferLight ? -12 : -22, { duration: LOGO_ANIM_MS * 0.55, easing: easeOut }),
        withTiming(preferLight ? -8 : -14, { duration: LOGO_ANIM_MS * 0.45, easing: easeInOut })
      )
    );

    titleOpacity.value = withDelay(
      TITLE_START_MS,
      withTiming(1, { duration: TITLE_ANIM_MS, easing: easeOut })
    );
    titleTranslateY.value = withDelay(
      TITLE_START_MS,
      withTiming(0, { duration: TITLE_ANIM_MS, easing: easeOut })
    );
    subtitleOpacity.value = withDelay(
      SUBTITLE_START_MS,
      withTiming(1, { duration: SUBTITLE_ANIM_MS, easing: easeOut })
    );

    bloomOpacity.value = withDelay(
      BLOOM_START_MS,
      withSequence(
        withTiming(preferLight ? 0.22 : 0.4, { duration: BLOOM_ANIM_MS * 0.5, easing: easeOut }),
        withTiming(preferLight ? 0.1 : 0.18, { duration: BLOOM_ANIM_MS * 0.5, easing: easeInOut })
      )
    );
    bloomScale.value = withDelay(
      BLOOM_START_MS,
      withTiming(1.1, { duration: BLOOM_ANIM_MS, easing: easeOut })
    );

    logStartup("cinematic_animation_started", `${elapsed()} ms`);

    // Hide native splash after the next frame so the cinematic layer is painted.
    const hideTask = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        onReadyRef.current?.();
      });
    });

    const floorTimer = setTimeout(() => {
      animationFloorDoneRef.current = true;
      logStartup("minimum_duration_complete", `${elapsed()} ms`);
      tryExitRef.current();
    }, minMs);

    const maxTimer = setTimeout(() => {
      animationFloorDoneRef.current = true;
      logStartup("splash_timeout", `${elapsed()} ms`);
      beginExitRef.current();
      setTimeout(() => finishSplashRef.current(), SPLASH_EXIT_FADE_MS + 80);
    }, SPLASH_MAX_VISIBLE_MS);

    return () => {
      hideTask.cancel?.();
      clearTimeout(floorTimer);
      clearTimeout(maxTimer);
    };
    // Start once when layout is ready — do not restart when motion prefs / bg resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cold-mount cinematic sequence
  }, [layoutReady]);

  useEffect(() => {
    tryExit();
  }, [canExit, tryExit]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scale: bgScale.value }]
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }, { scale: logoScale.value }]
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value
  }));

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    transform: [{ scale: bloomScale.value }]
  }));

  const exitWashStyle = useAnimatedStyle(() => ({
    opacity: exitWash.value
  }));

  const rootStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value
  }));

  const showParticles = enabled && !reduced;
  const titleTop = center.top + logoSize + 22;

  return (
    <Animated.View style={[styles.screen, rootStyle]} onLayout={onFirstLayout} collapsable={false}>
      <StatusBar style="dark" translucent backgroundColor={CINEMATIC_SPLASH_BG} />

      {!bgFailed ? (
        <Animated.Image
          source={SPLASH_ASSETS.background}
          style={[styles.background, bgStyle]}
          resizeMode="cover"
          onError={() => setBgFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : null}

      {showParticles ? (
        <SplashGoldenParticles originX={screenW / 2} originY={center.top + logoSize / 2} />
      ) : null}

      <View style={styles.logoLayer} pointerEvents="none">
        <Animated.View
          style={[
            styles.bloomWrap,
            bloomStyle,
            {
              width: bloomSize,
              height: bloomSize,
              left: bloomCenter.left,
              top: bloomCenter.top
            }
          ]}
        >
          <LinearGradient
            colors={["rgba(255, 220, 150, 0.4)", "rgba(255, 200, 120, 0.14)", "rgba(255, 200, 120, 0)"]}
            style={styles.bloomGradient}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>

        {/* Orbit + logo share one transform so the ring stays centered while the mark rises. */}
        <Animated.View
          style={[
            styles.logoCluster,
            logoStyle,
            {
              width: orbitSize,
              height: orbitSize,
              left: orbitCenter.left,
              top: orbitCenter.top
            }
          ]}
        >
          <SplashLogoOrbit
            size={orbitSize}
            left={0}
            top={0}
            active={layoutReady}
            startDelayMs={STATIC_HOLD_MS}
            reducedMotion={reduced || !enabled}
          />
          <View
            style={[
              styles.logoInner,
              {
                width: logoSize,
                height: logoSize,
                left: (orbitSize - logoSize) / 2,
                top: (orbitSize - logoSize) / 2
              }
            ]}
          >
            <Image
              source={SPLASH_ASSETS.logo}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Kavya Agri-Horti Clinic logo"
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.copyBlock, titleStyle, { top: titleTop, width: screenW }]}>
          <Text style={styles.title} accessibilityRole="header">
            {BRAND.splashTitle}
          </Text>
        </Animated.View>
        <Animated.View
          style={[styles.copyBlock, subtitleStyle, { top: titleTop + 36, width: screenW }]}
        >
          <Text style={styles.subtitle}>{BRAND.splashSubtitle}</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.exitWash, exitWashStyle]} pointerEvents="none" />
    </Animated.View>
  );
}

/** Total intended cinematic time including exit fade. */
export const KAVYA_CINEMATIC_SPLASH_MS = SPLASH_MIN_VISIBLE_MS + SPLASH_EXIT_FADE_MS;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: CINEMATIC_SPLASH_BG,
    flex: 1,
    overflow: "visible"
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  logoLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible"
  },
  bloomWrap: {
    position: "absolute",
    zIndex: 1
  },
  bloomGradient: {
    borderRadius: 9999,
    flex: 1
  },
  logoCluster: {
    overflow: "visible",
    position: "absolute",
    zIndex: 4
  },
  logoInner: {
    elevation: 8,
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 5
  },
  logoImage: {
    height: "100%",
    width: "100%"
  },
  copyBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
    position: "absolute"
  },
  title: {
    color: "#0B3D2E",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  subtitle: {
    color: "#1F4F40",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  exitWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_EXIT_WASH
  }
});
