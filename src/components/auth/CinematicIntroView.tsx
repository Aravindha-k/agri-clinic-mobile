import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BRAND, LOGO_IMAGE } from "../../brand/constants";
import { AUTH_THEME } from "../../theme/authTheme";
import { CinematicAuthBackground } from "./CinematicAuthBackground";

const INTRO_MS = 2600;
const FADE_MS = 400;

type Props = {
  onComplete: () => void;
};

/** Clean splash: logo, name, tagline, progress — no glow circles. */
export function CinematicIntroView({ onComplete }: Props) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(12)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const leafDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(leafDrift, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(leafDrift, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(textY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        ])
      ]),
      Animated.timing(progress, { toValue: 1, duration: INTRO_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) onComplete();
      });
    }, INTRO_MS);

    return () => clearTimeout(timer);
  }, [leafDrift, logoOpacity, logoScale, onComplete, progress, textOpacity, textY]);

  const progressW = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const leafY = leafDrift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]} pointerEvents="none">
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <CinematicAuthBackground />
        <Animated.View style={[styles.leafAccent, { transform: [{ translateY: leafY }] }]} pointerEvents="none">
          <Ionicons name="leaf" size={22} color="rgba(61,255,138,0.2)" />
        </Animated.View>

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
    zIndex: 20
  },
  safe: {
    flex: 1
  },
  leafAccent: {
    position: "absolute",
    right: 28,
    top: "18%"
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32
  },
  logoPlate: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: 88,
    justifyContent: "center",
    marginBottom: 24,
    width: 88
  },
  logo: {
    height: 64,
    width: 64
  },
  title: {
    color: AUTH_THEME.text,
    fontSize: 24,
    fontWeight: "700",
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
    marginTop: 36,
    overflow: "hidden",
    width: 200
  },
  progressFill: {
    backgroundColor: AUTH_THEME.neon,
    borderRadius: 2,
    height: 3
  }
});
