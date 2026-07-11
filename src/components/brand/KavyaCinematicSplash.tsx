import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { BRAND } from "../../config/brand";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";
import { logStartup } from "../../utils/startupDiagnostics";
import { SPLASH_ASSETS } from "./splashAssets";
import {
  CINEMATIC_SPLASH_BG,
  SPLASH_EXIT_FADE_MS,
  SPLASH_EXIT_WASH,
  SPLASH_HOLD_AFTER_ANIM_MS,
  SPLASH_MAX_VISIBLE_MS,
  SPLASH_MIN_VISIBLE_MS,
  SPLASH_NATIVE_HANDOFF_MS
} from "./splashColors";

const BLOOM_SIZE_RATIO = 1.65;
const TITLE_GAP = 22;
/** Logo center aligns with the background sunburst (~75% down the portrait art). */
const SPLASH_LOGO_Y_RATIO = 0.75;
const COPY_BLOCK_HEIGHT = 78;

/** Match Expo splash plugin imageWidth (~200 logical px). */
const LOGO_WIDTH_RATIO = 0.42;
const LOGO_MAX = 200;

/** Classic logo breathe — visible zoom in / out on splash. */
const SPLASH_LOGO_ZOOM_MIN = 0.92;
const SPLASH_LOGO_ZOOM_MAX = 1.1;
const SPLASH_LOGO_ZOOM_HALF_MS = 900;

/**
 * Timeline from first layout (ms):
 * 0         sharp full-opacity background + logo at 75%
 * 120–900   logo scale / bloom
 * 480–1220  title / subtitle reveal
 * then hold SPLASH_HOLD_AFTER_ANIM_MS until canExit
 * exit fade ~400 ms
 */
const LOGO_ANIM_MS = 780;
const TITLE_START_MS = 480;
const TITLE_ANIM_MS = 560;
const SUBTITLE_START_MS = 720;
const SUBTITLE_ANIM_MS = 500;
const BLOOM_START_MS = 650;
const BLOOM_ANIM_MS = 750;

type Props = {
  onFinish: () => void;
  /** Called once cinematic layer is painted — hide native splash here. */
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
 * Continuous splash: logo + title sit on the background yellow sunburst,
 * then a clearly visible cinematic beat, then exit when ready.
 */
export function KavyaCinematicSplash({ onFinish, onReady, onExitStart, canExit = false }: Props) {
  const { reduced } = usePremiumMotion();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  const logoOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const logoTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(14);
  const subtitleOpacity = useSharedValue(0);
  const bloomOpacity = useSharedValue(0.12);
  const bloomScale = useSharedValue(0.92);
  const exitWash = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const logoSize = useMemo(() => {
    const shortEdge = Math.min(screenW, screenH);
    return Math.min(screenW * LOGO_WIDTH_RATIO, LOGO_MAX, shortEdge * 0.45);
  }, [screenH, screenW]);

  const bloomSize = useMemo(() => Math.round(logoSize * BLOOM_SIZE_RATIO), [logoSize]);

  const logoCenterY = useMemo(() => {
    const desired = screenH * SPLASH_LOGO_Y_RATIO;
    const maxCenter =
      screenH - insets.bottom - COPY_BLOCK_HEIGHT - TITLE_GAP - logoSize / 2 - 12;
    return Math.min(desired, Math.max(logoSize / 2 + insets.top + 12, maxCenter));
  }, [insets.bottom, insets.top, logoSize, screenH]);

  const heroTop = useMemo(() => logoCenterY - logoSize / 2, [logoCenterY, logoSize]);

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
  preferLightRef.current = reduced;

  useEffect(() => {
    if (!layoutReady || animationStartedRef.current) return;
    animationStartedRef.current = true;

    const easeOut = Easing.out(Easing.cubic);
    const easeInOut = Easing.inOut(Easing.cubic);
    const preferLight = preferLightRef.current;
    const minMs = preferLight
      ? Math.min(SPLASH_MIN_VISIBLE_MS - 800, SPLASH_HOLD_AFTER_ANIM_MS + 900)
      : SPLASH_MIN_VISIBLE_MS;

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

    logoOpacity.value = 1;
    logoScale.value = SPLASH_LOGO_ZOOM_MIN;
    logoTranslateY.value = 0;
    titleOpacity.value = 0;
    titleTranslateY.value = 14;
    subtitleOpacity.value = 0;
    exitWash.value = 0;
    screenOpacity.value = 1;

    const zoomHalfMs = preferLight ? SPLASH_LOGO_ZOOM_HALF_MS + 120 : SPLASH_LOGO_ZOOM_HALF_MS;
    const zoomMin = preferLight ? 0.94 : SPLASH_LOGO_ZOOM_MIN;
    const zoomMax = preferLight ? 1.06 : SPLASH_LOGO_ZOOM_MAX;

    logoScale.value = withDelay(
      120,
      withRepeat(
        withSequence(
          withTiming(zoomMax, { duration: zoomHalfMs, easing: easeOut }),
          withTiming(zoomMin, { duration: zoomHalfMs, easing: easeInOut })
        ),
        -1,
        false
      )
    );
    logoTranslateY.value = withDelay(
      120,
      withSequence(
        withTiming(preferLight ? -8 : -12, { duration: LOGO_ANIM_MS * 0.55, easing: easeOut }),
        withTiming(preferLight ? -4 : -6, { duration: LOGO_ANIM_MS * 0.45, easing: easeInOut })
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
        withTiming(preferLight ? 0.28 : 0.48, { duration: BLOOM_ANIM_MS * 0.5, easing: easeOut }),
        withTiming(preferLight ? 0.14 : 0.22, { duration: BLOOM_ANIM_MS * 0.5, easing: easeInOut })
      )
    );
    bloomScale.value = withDelay(
      BLOOM_START_MS,
      withTiming(1.1, { duration: BLOOM_ANIM_MS, easing: easeOut })
    );

    logStartup("cinematic_animation_started", `${elapsed()} ms`);

    const handoffTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        onReadyRef.current?.();
      });
    }, SPLASH_NATIVE_HANDOFF_MS);

    const floorTimer = setTimeout(() => {
      animationFloorDoneRef.current = true;
      logStartup("minimum_duration_complete", `${elapsed()} ms`);
      tryExitRef.current();
    }, minMs);

    const maxTimer = setTimeout(() => {
      animationFloorDoneRef.current = true;
      logStartup("splash_timeout", `${elapsed()} ms`);
      beginExitRef.current();
    }, SPLASH_MAX_VISIBLE_MS);

    return () => {
      clearTimeout(handoffTimer);
      clearTimeout(floorTimer);
      clearTimeout(maxTimer);
    };
    // Start once when layout is ready — do not restart when motion prefs / bg resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cold-mount cinematic sequence
  }, [layoutReady]);

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

  return (
    <Animated.View style={[styles.screen, rootStyle]} onLayout={onFirstLayout} collapsable={false}>
      <StatusBar style="dark" translucent backgroundColor={CINEMATIC_SPLASH_BG} />

      {!bgFailed ? (
        <Image
          source={SPLASH_ASSETS.background}
          style={styles.background}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => setBgFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : null}

      <View style={styles.logoLayer} pointerEvents="none">
        <View style={[styles.heroColumn, { top: heroTop, width: screenW }]}>
          <Animated.View
            style={[styles.logoCluster, logoStyle, { width: logoSize, height: logoSize }]}
          >
            <Animated.View
              style={[
                styles.bloomWrap,
                bloomStyle,
                {
                  width: bloomSize,
                  height: bloomSize,
                  left: (logoSize - bloomSize) / 2,
                  top: (logoSize - bloomSize) / 2
                }
              ]}
            >
              <Svg width={bloomSize} height={bloomSize}>
                <Defs>
                  <RadialGradient id="splashLogoGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0%" stopColor="#FFE08A" stopOpacity={0.62} />
                    <Stop offset="40%" stopColor="#FFC96B" stopOpacity={0.28} />
                    <Stop offset="100%" stopColor="#FFC96B" stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={bloomSize / 2} cy={bloomSize / 2} r={bloomSize / 2} fill="url(#splashLogoGlow)" />
              </Svg>
            </Animated.View>

            <Image
              source={SPLASH_ASSETS.logo}
              style={[styles.logoImage, { width: logoSize, height: logoSize }]}
              resizeMode="contain"
              accessibilityLabel="Kavya Agri-Horti Clinic logo"
            />
          </Animated.View>

          <Animated.View style={[styles.copyBlock, titleStyle, { marginTop: TITLE_GAP }]}>
            <Text style={styles.title} accessibilityRole="header">
              {BRAND.splashTitle}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.copyBlock, subtitleStyle, { marginTop: 8 }]}>
            <Text style={styles.subtitle}>{BRAND.splashSubtitle}</Text>
          </Animated.View>
        </View>
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
    height: "100%",
    width: "100%"
  },
  logoLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible"
  },
  heroColumn: {
    alignItems: "center",
    left: 0,
    position: "absolute"
  },
  bloomWrap: {
    position: "absolute",
    zIndex: 1
  },
  logoCluster: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    zIndex: 4
  },
  logoImage: {
    aspectRatio: 1,
    zIndex: 5
  },
  copyBlock: {
    alignItems: "center",
    paddingHorizontal: 24
  },
  title: {
    color: "#0B3D2E",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center"
  },
  subtitle: {
    color: "#1F4F40",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center"
  },
  exitWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_EXIT_WASH
  }
});
