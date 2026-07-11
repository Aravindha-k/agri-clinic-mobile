import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
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
 * 0–280     static first frame (= native splash: blue + centered logo)
 * 280–1000  logo rise / scale + title reveal
 * 700–1500  soft bloom + subtitle
 * then hold until canExit ∧ min duration
 * exit fade ~320 ms
 */
const STATIC_HOLD_MS = 280;
const LOGO_ANIM_MS = 720;
const TITLE_START_MS = 420;
const TITLE_ANIM_MS = 520;
const SUBTITLE_START_MS = 720;
const SUBTITLE_ANIM_MS = 480;
const BLOOM_START_MS = 700;
const BLOOM_ANIM_MS = 700;

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
 * then visible brand motion, then exit when `canExit` and min duration are both met.
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
  const [layoutGeneration, setLayoutGeneration] = useState(0);

  canExitRef.current = canExit;
  onReadyRef.current = onReady;
  onExitStartRef.current = onExitStart;
  onFinishRef.current = onFinish;

  const logoOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const logoTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(10);
  const subtitleOpacity = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.85);
  const exitWash = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const logoSize = useMemo(() => {
    const shortEdge = Math.min(screenW, screenH);
    return Math.min(screenW * LOGO_WIDTH_RATIO, LOGO_MAX, shortEdge * 0.45);
  }, [screenH, screenW]);

  const bloomSize = useMemo(() => logoSize * 1.45, [logoSize]);

  const center = useMemo(
    () => ({
      left: (screenW - logoSize) / 2,
      top: (screenH - logoSize) / 2
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

  useEffect(() => {
    logStartup("cinematic_component_rendered", "0 ms");
  }, []);

  const onFirstLayout = useCallback(() => {
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    layoutAtRef.current = Date.now();
    logStartup("cinematic_first_layout", "0 ms");
    setLayoutGeneration(1);
  }, []);

  useEffect(() => {
    if (layoutGeneration === 0) return;
    if (animationStartedRef.current) return;
    animationStartedRef.current = true;

    const easeOut = Easing.out(Easing.cubic);
    const easeInOut = Easing.inOut(Easing.cubic);
    const minMs = reduced || !enabled ? Math.min(1200, SPLASH_MIN_VISIBLE_MS) : SPLASH_MIN_VISIBLE_MS;

    // Reset to native-matching first frame on every cold mount.
    logoOpacity.value = 1;
    logoScale.value = 1;
    logoTranslateY.value = 0;
    titleOpacity.value = 0;
    titleTranslateY.value = 10;
    subtitleOpacity.value = 0;
    bloomOpacity.value = 0;
    bloomScale.value = 0.85;
    exitWash.value = 0;
    screenOpacity.value = 1;

    if (!(reduced || !enabled)) {
      logoScale.value = withDelay(
        STATIC_HOLD_MS,
        withTiming(1.08, { duration: LOGO_ANIM_MS, easing: easeOut })
      );
      logoTranslateY.value = withDelay(
        STATIC_HOLD_MS,
        withSequence(
          withTiming(-18, { duration: LOGO_ANIM_MS * 0.55, easing: easeOut }),
          withTiming(-10, { duration: LOGO_ANIM_MS * 0.45, easing: easeInOut })
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
          withTiming(0.34, { duration: BLOOM_ANIM_MS * 0.5, easing: easeOut }),
          withTiming(0.16, { duration: BLOOM_ANIM_MS * 0.5, easing: easeInOut })
        )
      );
      bloomScale.value = withDelay(
        BLOOM_START_MS,
        withTiming(1.08, { duration: BLOOM_ANIM_MS, easing: easeOut })
      );
    } else {
      // Reduced motion: still reveal brand copy so splash is not a frozen logo.
      titleOpacity.value = withDelay(200, withTiming(1, { duration: 280 }));
      titleTranslateY.value = withDelay(200, withTiming(0, { duration: 280 }));
      subtitleOpacity.value = withDelay(360, withTiming(1, { duration: 240 }));
    }

    logStartup("cinematic_animation_started", `${elapsed()} ms`);
    // Hide native splash only after cinematic layer is laid out and animation has started.
    onReadyRef.current?.();

    const floorTimer = setTimeout(() => {
      animationFloorDoneRef.current = true;
      logStartup("minimum_duration_complete", `${elapsed()} ms`);
      tryExit();
    }, minMs);

    const maxTimer = setTimeout(() => {
      animationFloorDoneRef.current = true;
      logStartup("splash_timeout", `${elapsed()} ms`);
      beginExit();
      setTimeout(() => finishSplash(), SPLASH_EXIT_FADE_MS + 80);
    }, SPLASH_MAX_VISIBLE_MS);

    return () => {
      clearTimeout(floorTimer);
      clearTimeout(maxTimer);
    };
    // Intentionally start once per layout generation — avoid restarting when parent callbacks change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cold-mount animation sequence
  }, [layoutGeneration]);

  useEffect(() => {
    tryExit();
  }, [canExit, tryExit]);

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

  const showMotion = enabled && !reduced;
  // Title sits under the logo after it rises (~10–18px); keep copy clear of the mark.
  const titleTop = center.top + logoSize + 28;

  return (
    <Animated.View style={[styles.screen, rootStyle]} onLayout={onFirstLayout} collapsable={false}>
      <StatusBar style="dark" translucent backgroundColor={CINEMATIC_SPLASH_BG} />

      {showMotion ? (
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
            colors={["rgba(255, 220, 150, 0.35)", "rgba(255, 200, 120, 0.12)", "rgba(255, 200, 120, 0)"]}
            style={styles.bloomGradient}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.logoWrap,
            logoStyle,
            {
              width: logoSize,
              height: logoSize,
              left: center.left,
              top: center.top
            }
          ]}
        >
          <Image
            source={SPLASH_ASSETS.logo}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityLabel="Kavya Agri-Horti Clinic logo"
          />
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
    flex: 1
  },
  logoLayer: {
    ...StyleSheet.absoluteFillObject
  },
  bloomWrap: {
    position: "absolute"
  },
  bloomGradient: {
    borderRadius: 9999,
    flex: 1
  },
  logoWrap: {
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6
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
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center"
  },
  subtitle: {
    color: "#3D6B5C",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
    textAlign: "center"
  },
  exitWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_EXIT_WASH
  }
});
