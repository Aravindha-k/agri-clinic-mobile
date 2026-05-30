import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BRAND, LOGO_IMAGE } from "../../brand/constants";
import { AUTH_THEME } from "../../theme/authTheme";
import { CropLineAccent } from "./CropLineAccent";
import { PremiumIntroBackground } from "./PremiumIntroBackground";
import { Ionicons } from "@expo/vector-icons";

export const BRAND_INTRO_MS = 1500;
const FADE_MS = 320;

type Props = {
  onComplete: () => void;
  durationMs?: number;
};

/** Step 1 — brand intro with logo, tagline, crop accent (~1.5s). */
export function BrandIntroStep({ onComplete, durationMs = BRAND_INTRO_MS }: Props) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(10)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 62, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(textOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(textY, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true })
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
        <PremiumIntroBackground variant="brand" />
        <View style={styles.center}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <View style={styles.logoPlate}>
              {LOGO_IMAGE ? (
                <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo" />
              ) : (
                <Ionicons name="leaf" size={40} color={AUTH_THEME.neonMid} />
              )}
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}>
            <Text style={styles.title}>{BRAND.appName}</Text>
            <Text style={styles.tag}>{BRAND.tagline}</Text>
            <CropLineAccent />
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
    borderRadius: 22,
    height: 96,
    justifyContent: "center",
    marginBottom: 22,
    width: 96
  },
  logo: { height: 68, width: 68 },
  title: {
    color: AUTH_THEME.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center"
  },
  tag: {
    color: AUTH_THEME.textMuted,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center"
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    height: 3,
    marginTop: 36,
    overflow: "hidden",
    width: 160
  },
  progressFill: {
    backgroundColor: AUTH_THEME.neon,
    borderRadius: 2,
    height: 3
  }
});
