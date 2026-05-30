import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BRAND, LOGO_IMAGE } from "../../brand/constants";
import { AUTH_THEME } from "../../theme/authTheme";
import { CinematicAuthBackground } from "./CinematicAuthBackground";
import { FloatingLeaves } from "./FloatingLeaves";

export const BRAND_INTRO_MS = 1750;
const FADE_MS = 380;

type Props = {
  onComplete: () => void;
  durationMs?: number;
};

/** Animated brand splash — logo scale/fade, tagline, progress (~1.5–2s). */
export function BrandIntroStep({ onComplete, durationMs = BRAND_INTRO_MS }: Props) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.84)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(14)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 58, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(280),
        Animated.parallel([
          Animated.timing(textOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(textY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        ])
      ]),
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false
      })
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) onComplete();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, logoOpacity, logoScale, onComplete, progress, screenOpacity, textOpacity, textY]);

  const progressW = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <CinematicAuthBackground />
        <FloatingLeaves />
        <View style={styles.center}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <View style={styles.logoPlate}>
              {LOGO_IMAGE ? (
                <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo" />
              ) : (
                <Ionicons name="leaf" size={42} color={AUTH_THEME.neonMid} />
              )}
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}>
            <Text style={styles.title}>{BRAND.appName}</Text>
            <Text style={styles.tag}>{BRAND.tagline}</Text>
          </Animated.View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressW }]} />
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_THEME.bg,
    zIndex: 40
  },
  safe: { flex: 1 },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  logoPlate: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: 92,
    justifyContent: "center",
    marginBottom: 20,
    width: 92
  },
  logo: { height: 66, width: 66 },
  title: {
    color: AUTH_THEME.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center"
  },
  tag: {
    color: AUTH_THEME.textMuted,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center"
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    height: 3,
    marginTop: 32,
    overflow: "hidden",
    width: 180
  },
  progressFill: {
    backgroundColor: AUTH_THEME.neon,
    borderRadius: 2,
    height: 3
  }
});
