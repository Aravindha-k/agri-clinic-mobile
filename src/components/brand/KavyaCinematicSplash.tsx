import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { SplashGoldenParticles } from "./SplashGoldenParticles";
import { SPLASH_ASSETS } from "./splashAssets";
import {
  CINEMATIC_SPLASH_BG,
  SPLASH_EXIT_FADE_MS,
  SPLASH_EXIT_WASH,
  SPLASH_MAX_VISIBLE_MS,
  SPLASH_MIN_VISIBLE_MS
} from "./splashColors";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";
import { logStartup } from "../../utils/startupDiagnostics";

/** Match Expo splash plugin imageWidth (~200 logical px). */
const LOGO_WIDTH_RATIO = 0.42;
const LOGO_MAX = 200;

/**
 * Timeline from first layout (ms):
 * 0–250   static first frame (= native splash)
 * 250–900 logo rise / scale
 * 700–1400 soft bloom
 * then hold until canExit
 * exit fade ~320 ms
 */
const STATIC_HOLD_MS = 250;
const LOGO_ANIM_MS = 650;
const BLOOM_START_MS = 700;
const BLOOM_ANIM_MS = 700;

type Props = {
  onFinish: () => void;
  /** Called once after first layout — hide native splash here. */
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
 * then subtle motion, then exit when `canExit` and min duration are both met.
 */
export function KavyaCinematicSplash({ onFinish, onReady, onExitStart, canExit = false }: Props) {
  const { reduced, enabled } = usePremiumMotion();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const layoutAtRef = useRef<number | null>(null);
  const readyNotifiedRef = useRef(false);
  const exitStartedRef = useRef(false);
  const finishedRef = useRef(false);
  const animationFloorDoneRef = useRef(false);
  const canExitRef = useRef(canExit);
  const [layoutGeneration, setLayoutGeneration] = useState(0);

  canExitRef.current = canExit;

  const logoOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const logoTranslateY = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.85);
  const exitWash = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const logoSize = useMemo(() => {
    const shortEdge = Math.min(screenW, screenH);
    return Math.min(screenW * LOGO_WIDTH_RATIO, LOGO_MAX, shortEdge * 0.45);
  }, [screenH, screenW]);

  const bloomSize = useMemo(() => logoSize * 1.35, [logoSize]);

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
      top: (screenH - bloomSize) / 2
    }),
    [bloomSize, screenH, screenW]
  );

  const elapsed = useCallback(() => {
    const start = layoutAtRef.current ?? Date.now();
    return Math.max(0, Date.now() - start);
  }, []);

  const finishSplash = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    logStartup("cinematic_finished", `${elapsed()} ms`);
    onFinish();
  }, [elapsed, onFinish]);

  const beginExit = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    logStartup("cinematic_exit_start", `${elapsed()} ms`);
    onExitStart?.();

    const easeInOut = Easing.inOut(Easing.cubic);
    exitWash.value = withTiming(1, { duration: SPLASH_EXIT_FADE_MS, easing: easeInOut });
    screenOpacity.value = withTiming(0, { duration: SPLASH_EXIT_FADE_MS, easing: easeInOut }, (done) => {
      if (done) {
        runOnJS(finishSplash)();
      }
    });
  }, [elapsed, exitWash, finishSplash, onExitStart, screenOpacity]);

  const tryExit = useCallback(() => {
    if (exitStartedRef.current || finishedRef.current) return;
    if (!animationFloorDoneRef.current) return;
    if (!canExitRef.current) return;
    beginExit();
  }, [beginExit]);

  const onFirstLayout = useCallback(() => {
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    layoutAtRef.current = Date.now();
    logStartup("cinematic_mounted", "0 ms");
    logStartup("cinematic_first_layout", "0 ms");
    onReady?.();
    setLayoutGeneration(1);
  }, [onReady]);

  useEffect(() => {
    if (layoutGeneration === 0) return;

    const easeOut = Easing.out(Easing.cubic);
    const easeInOut = Easing.inOut(Easing.cubic);
    const minMs = reduced || !enabled ? Math.min(1200, SPLASH_MIN_VISIBLE_MS) : SPLASH_MIN_VISIBLE_MS;

    if (!(reduced || !enabled)) {
      logoScale.value = withDelay(
        STATIC_HOLD_MS,
        withTiming(1.04, { duration: LOGO_ANIM_MS, easing: easeOut })
      );
      logoTranslateY.value = withDelay(
        STATIC_HOLD_MS,
        withSequence(
          withTiming(-8, { duration: LOGO_ANIM_MS * 0.55, easing: easeOut }),
          withTiming(0, { duration: LOGO_ANIM_MS * 0.45, easing: easeInOut })
        )
      );
      bloomOpacity.value = withDelay(
        BLOOM_START_MS,
        withSequence(
          withTiming(0.28, { duration: BLOOM_ANIM_MS * 0.5, easing: easeOut }),
          withTiming(0.12, { duration: BLOOM_ANIM_MS * 0.5, easing: easeInOut })
        )
      );
      bloomScale.value = withDelay(
        BLOOM_START_MS,
        withTiming(1.05, { duration: BLOOM_ANIM_MS, easing: easeOut })
      );
    }

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
  }, [
    beginExit,
    bloomOpacity,
    bloomScale,
    elapsed,
    enabled,
    finishSplash,
    layoutGeneration,
    logoScale,
    logoTranslateY,
    reduced,
    tryExit
  ]);

  useEffect(() => {
    tryExit();
  }, [canExit, tryExit]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }, { scale: logoScale.value }]
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

  return (
    <Animated.View style={[styles.screen, rootStyle]} onLayout={onFirstLayout}>
      <StatusBar style="dark" translucent backgroundColor={CINEMATIC_SPLASH_BG} />

      {showMotion ? (
        <SplashGoldenParticles originX={screenW / 2} originY={screenH / 2} />
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
            colors={["rgba(255, 220, 150, 0.3)", "rgba(255, 200, 120, 0.1)", "rgba(255, 200, 120, 0)"]}
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
  exitWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_EXIT_WASH
  }
});
