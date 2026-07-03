import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef } from "react";
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

const BG_SOURCE = Image.resolveAssetSource(SPLASH_ASSETS.background);
const BG_WIDTH = BG_SOURCE?.width ?? 681;
const BG_HEIGHT = BG_SOURCE?.height ?? 1024;

/** Golden sunburst anchor in the artwork (not screen center). */
const LOGO_ANCHOR_X = 0.5;
const LOGO_ANCHOR_Y = 0.75;
const LOGO_WIDTH_RATIO = 0.34;

const LOGIN_BG = "#F8F7F2";

function mapCoverAnchorToScreen(
  screenW: number,
  screenH: number,
  anchorX: number,
  anchorY: number
) {
  const scale = Math.max(screenW / BG_WIDTH, screenH / BG_HEIGHT);
  const displayW = BG_WIDTH * scale;
  const displayH = BG_HEIGHT * scale;
  const offsetX = (screenW - displayW) / 2;
  const offsetY = (screenH - displayH) / 2;

  return {
    x: offsetX + anchorX * displayW,
    y: offsetY + anchorY * displayH
  };
}

/** Total splash time incl. fade-out (~4.5s visible). */
export const KAVYA_CINEMATIC_SPLASH_MS = 4500;
const BG_FADE_IN_MS = 400;
const KEN_BURNS_MS = 4000;
const LOGO_START_MS = 500;
const LOGO_ANIM_MS = 900;
const BLOOM_ANIM_MS = 1200;
const FADE_OUT_MS = 500;
const HOLD_MS = KAVYA_CINEMATIC_SPLASH_MS - FADE_OUT_MS;

type Props = {
  onFinish: () => void;
  onReady?: () => void;
};

/**
 * Premium splash — Ken Burns background, sunburst bloom, logo rise, golden particles.
 */
export function KavyaCinematicSplash({ onFinish, onReady }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const mountedRef = useRef(false);
  const finishedRef = useRef(false);

  const bgOpacity = useSharedValue(0);
  const bgScale = useSharedValue(1);
  const bgTranslateY = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const logoTranslateY = useSharedValue(10);
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.75);
  const exitWash = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const logoSize = useMemo(() => {
    const shortEdge = Math.min(screenW, screenH);
    return Math.min(screenW * LOGO_WIDTH_RATIO, screenH * 0.22, shortEdge * 0.34);
  }, [screenH, screenW]);

  const bloomSize = useMemo(() => logoSize * 1.3, [logoSize]);

  const anchor = useMemo(
    () => mapCoverAnchorToScreen(screenW, screenH, LOGO_ANCHOR_X, LOGO_ANCHOR_Y),
    [screenH, screenW]
  );

  const logoPosition = useMemo(
    () => ({
      left: anchor.x - logoSize / 2,
      top: anchor.y - logoSize / 2
    }),
    [anchor.x, anchor.y, logoSize]
  );

  const bloomPosition = useMemo(
    () => ({
      left: anchor.x - bloomSize / 2,
      top: anchor.y - bloomSize / 2
    }),
    [anchor.x, anchor.y, bloomSize]
  );

  const finishSplash = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    console.warn("[KavyaCinematicSplash] finished");
    onFinish();
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    console.warn("[KavyaCinematicSplash] mounted");
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    const easeInOut = Easing.inOut(Easing.cubic);
    const easeOut = Easing.out(Easing.cubic);

    bgOpacity.value = withTiming(1, { duration: BG_FADE_IN_MS, easing: easeOut });

    bgScale.value = withDelay(
      BG_FADE_IN_MS,
      withTiming(1.03, { duration: KEN_BURNS_MS, easing: easeInOut })
    );
    bgTranslateY.value = withDelay(
      BG_FADE_IN_MS,
      withTiming(-8, { duration: KEN_BURNS_MS, easing: easeInOut })
    );

    logoOpacity.value = withDelay(
      LOGO_START_MS,
      withTiming(1, { duration: LOGO_ANIM_MS, easing: easeOut })
    );
    logoScale.value = withDelay(
      LOGO_START_MS,
      withTiming(1, { duration: LOGO_ANIM_MS, easing: easeOut })
    );
    logoTranslateY.value = withDelay(
      LOGO_START_MS,
      withTiming(0, { duration: LOGO_ANIM_MS, easing: easeOut })
    );

    bloomOpacity.value = withDelay(
      LOGO_START_MS,
      withSequence(
        withTiming(0.32, { duration: BLOOM_ANIM_MS * 0.55, easing: easeOut }),
        withTiming(0.14, { duration: BLOOM_ANIM_MS * 0.45, easing: easeInOut })
      )
    );
    bloomScale.value = withDelay(
      LOGO_START_MS,
      withSequence(
        withTiming(1.06, { duration: BLOOM_ANIM_MS * 0.55, easing: easeOut }),
        withTiming(1, { duration: BLOOM_ANIM_MS * 0.45, easing: easeInOut })
      )
    );

    const fadeTimer = setTimeout(() => {
      exitWash.value = withTiming(1, { duration: FADE_OUT_MS, easing: easeInOut });
      screenOpacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: easeInOut }, (done) => {
        if (done) {
          runOnJS(finishSplash)();
        }
      });
    }, HOLD_MS);

    return () => clearTimeout(fadeTimer);
  }, [
    bgOpacity,
    bgScale,
    bgTranslateY,
    bloomOpacity,
    bloomScale,
    exitWash,
    logoOpacity,
    logoScale,
    logoTranslateY,
    screenOpacity
  ]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scale: bgScale.value }, { translateY: bgTranslateY.value }]
  }));

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

  return (
    <Animated.View style={[styles.screen, rootStyle]}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.artworkClip}>
        <Animated.View style={[styles.artworkMotion, bgStyle]}>
          <Image
            source={SPLASH_ASSETS.background}
            style={styles.artwork}
            resizeMode="cover"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Animated.View>
      </View>

      <SplashGoldenParticles originX={anchor.x} originY={anchor.y} />

      <View style={styles.logoLayer} pointerEvents="none">
        <Animated.View
          style={[
            styles.bloomWrap,
            bloomStyle,
            {
              width: bloomSize,
              height: bloomSize,
              left: bloomPosition.left,
              top: bloomPosition.top
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
              left: logoPosition.left,
              top: logoPosition.top
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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#B8DCF5",
    flex: 1
  },
  artworkClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden"
  },
  artworkMotion: {
    ...StyleSheet.absoluteFillObject
  },
  artwork: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%"
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
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8
  },
  logoImage: {
    height: "100%",
    width: "100%"
  },
  exitWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: LOGIN_BG
  }
});
