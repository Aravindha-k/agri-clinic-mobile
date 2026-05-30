import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BRAND, LOGO_IMAGE } from "../../brand/constants";
import { AUTH_THEME } from "../../theme/authTheme";
import { AuthScreenLayout } from "./AuthScreenLayout";
import { CropLineAccent } from "./CropLineAccent";

export const BRAND_INTRO_MS = 1800;
const FADE_MS = 350;

type Props = {
  onComplete: () => void;
  durationMs?: number;
};

export function BrandIntroStep({ onComplete, durationMs = BRAND_INTRO_MS }: Props) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(12)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.4, duration: 900, useNativeDriver: true })
      ])
    ).start();

    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(260),
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
  }, [durationMs, glow, logoOpacity, logoScale, onComplete, progress, screenOpacity, textOpacity, textY]);

  const progressW = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]}>
      <AuthScreenLayout variant="brand" contentStyle={styles.center}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Animated.View style={[styles.logoGlow, { opacity: glow }]} />
          <View style={styles.logoPlate}>
            {LOGO_IMAGE ? (
              <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo" />
            ) : (
              <Ionicons name="leaf" size={44} color={AUTH_THEME.neonMid} />
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
      </AuthScreenLayout>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_THEME.bg,
    zIndex: 50
  },
  center: {
    alignItems: "center",
    justifyContent: "center"
  },
  logoGlow: {
    backgroundColor: "rgba(61,255,138,0.22)",
    borderRadius: 40,
    height: 120,
    position: "absolute",
    width: 120
  },
  logoPlate: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 8,
    height: 104,
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#3DFF8A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    width: 104
  },
  logo: { height: 72, width: 72 },
  title: {
    color: AUTH_THEME.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center"
  },
  tag: {
    color: AUTH_THEME.textMuted,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.4,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center"
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 3,
    height: 4,
    marginTop: 40,
    overflow: "hidden",
    width: 200
  },
  progressFill: {
    backgroundColor: AUTH_THEME.neon,
    borderRadius: 3,
    height: 4
  }
});
