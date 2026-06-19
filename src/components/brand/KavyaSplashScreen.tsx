import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { BRAND } from "../../config/brand";
import { NaturePalette } from "../../../mobile/lib/fieldTheme";

export const SPLASH_INTRO_MS = BRAND.splashDurationMs ?? 5500;
export const SPLASH_REDUCE_MOTION_MS = 800;

const RICE_PADDY_VIDEO = require("../../../assets/splash/rice-paddy.mp4");
const RICE_FIELD_POSTER = require("../../../assets/splash/rice-field.png");
const SPLASH_LOGO = require("../../../assets/brand/logo-splash.png");

const VIDEO_PLAYBACK_RATE = 0.65;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("screen");
const LOGO_SIZE = Math.round(Math.min(SCREEN_W * 0.56, SCREEN_H * 0.26, 220));
const LOGO_DROP_FROM = -Math.min(SCREEN_H * 0.22, 180);

type Props = {
  onFinish: () => void;
  onReady?: () => void;
};

function RiceVideoBackground({
  useVideo,
  onDisplayed
}: {
  useVideo: boolean;
  onDisplayed?: () => void;
}) {
  const videoRef = useRef<Video>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (!useVideo || videoFailed) {
      onDisplayed?.();
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        await videoRef.current?.setIsMutedAsync(true);
        await videoRef.current?.setRateAsync(VIDEO_PLAYBACK_RATE, true);
        await videoRef.current?.playAsync();
      } catch {
        if (mounted) {
          setVideoFailed(true);
        }
      }
    })();

    return () => {
      mounted = false;
      void videoRef.current?.stopAsync();
    };
  }, [useVideo, videoFailed, onDisplayed]);

  const mediaStyle = { width: SCREEN_W, height: SCREEN_H };

  return (
    <View style={styles.mediaShell}>
      {useVideo && !videoFailed ? (
        <Video
          ref={videoRef}
          source={RICE_PADDY_VIDEO}
          style={mediaStyle}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
          onReadyForDisplay={onDisplayed}
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <Image source={RICE_FIELD_POSTER} style={mediaStyle} resizeMode="cover" onLoad={onDisplayed} />
      )}
      <LinearGradient
        colors={["rgba(6,24,16,0.15)", "rgba(6,24,16,0.02)", "rgba(6,24,16,0.45)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", NaturePalette.sunlightSoft]}
        locations={[0.7, 1]}
        style={styles.sunWash}
        pointerEvents="none"
      />
    </View>
  );
}

function SplashLogoMark() {
  return (
    <Image
      source={SPLASH_LOGO}
      style={styles.logoMark}
      resizeMode="contain"
      accessibilityLabel="Kavya Agri Clinic logo"
    />
  );
}

function OrganicGrowthRings() {
  const scale = useSharedValue(0.72);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(400, withTiming(0.35, { duration: 1200, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.92, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={[styles.growthRing, ringStyle]} pointerEvents="none">
      <View style={styles.growthRingInner} />
    </Animated.View>
  );
}

function BrandReveal({ onFinish, onReady, useVideo }: Props & { useVideo: boolean }) {
  const logoOpacity = useSharedValue(0);
  const logoRise = useSharedValue(LOGO_DROP_FROM);
  const titleOpacity = useSharedValue(0);
  const titleRise = useSharedValue(28);
  const taglineOpacity = useSharedValue(0);
  const nativeSplashHidden = useRef(false);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoRise.value }]
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleRise.value }]
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value
  }));

  const hideNativeOnce = () => {
    if (nativeSplashHidden.current) {
      return;
    }
    nativeSplashHidden.current = true;
    onReady?.();
  };

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);

    logoOpacity.value = withDelay(1200, withTiming(1, { duration: 700, easing: easeOut }));
    logoRise.value = withDelay(1200, withTiming(0, { duration: 780, easing: easeOut }));

    titleOpacity.value = withDelay(1650, withTiming(1, { duration: 650, easing: easeOut }));
    titleRise.value = withDelay(1650, withTiming(0, { duration: 700, easing: easeOut }));

    taglineOpacity.value = withDelay(2100, withTiming(1, { duration: 550, easing: easeOut }));

    const finishTimer = setTimeout(onFinish, SPLASH_INTRO_MS);
    return () => clearTimeout(finishTimer);
  }, [logoOpacity, logoRise, onFinish, taglineOpacity, titleOpacity, titleRise]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <RiceVideoBackground useVideo={useVideo} onDisplayed={hideNativeOnce} />
      <OrganicGrowthRings />

      <SafeAreaView style={styles.brandStage} pointerEvents="none">
        <View style={styles.brandBlock}>
          <Animated.View style={logoStyle}>
            <SplashLogoMark />
          </Animated.View>
          <Animated.Text style={[styles.title, titleStyle]}>{BRAND.splashTitle}</Animated.Text>
          <Animated.Text style={[styles.tagline, taglineStyle]}>{BRAND.tagline}</Animated.Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ReducedMotionSplash({ onFinish, onReady }: Props) {
  const opacity = useSharedValue(0);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  useEffect(() => {
    onReady?.();
    opacity.value = withTiming(1, { duration: SPLASH_REDUCE_MOTION_MS, easing: Easing.out(Easing.quad) });

    const finishTimer = setTimeout(onFinish, SPLASH_REDUCE_MOTION_MS);
    return () => clearTimeout(finishTimer);
  }, [onFinish, onReady, opacity]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <RiceVideoBackground useVideo={false} onDisplayed={onReady} />
      <SafeAreaView style={styles.brandStage}>
        <Animated.View style={[styles.brandBlock, brandStyle]}>
          <SplashLogoMark />
          <Text style={styles.title}>{BRAND.splashTitle}</Text>
          <Text style={styles.tagline}>{BRAND.tagline}</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

export function KavyaSplashScreen({ onFinish, onReady }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        if (mounted) {
          setReduceMotion(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (reduceMotion) {
    return <ReducedMotionSplash onFinish={onFinish} onReady={onReady} />;
  }

  return <BrandReveal onFinish={onFinish} onReady={onReady} useVideo />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: NaturePalette.forestDeep
  },
  mediaShell: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NaturePalette.forestDeep,
    overflow: "hidden"
  },
  sunWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5
  },
  growthRing: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "rgba(107, 196, 138, 0.35)",
    borderRadius: 999,
    borderWidth: 1,
    height: SCREEN_W * 0.72,
    justifyContent: "center",
    position: "absolute",
    top: SCREEN_H * 0.22,
    width: SCREEN_W * 0.72
  },
  growthRingInner: {
    borderColor: "rgba(244, 228, 184, 0.2)",
    borderRadius: 999,
    borderWidth: 1,
    height: "78%",
    width: "78%"
  },
  brandStage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    overflow: "visible"
  },
  brandBlock: {
    alignItems: "center",
    width: "100%",
    overflow: "visible"
  },
  logoMark: {
    width: LOGO_SIZE,
    height: LOGO_SIZE
  },
  title: {
    marginTop: 16,
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10
  },
  tagline: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: "rgba(255,255,255,0.94)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  }
});
