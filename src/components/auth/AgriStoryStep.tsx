import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AUTH_THEME } from "../../theme/authTheme";
import { PremiumIntroBackground } from "./PremiumIntroBackground";

export const STORY_INTRO_MS = 1500;
const FADE_MS = 320;

type Props = {
  onComplete: () => void;
  durationMs?: number;
};

/** Step 2 — field mission story with shimmer progress (~1.5s). */
export function AgriStoryStep({ onComplete, durationMs = STORY_INTRO_MS }: Props) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(14)).current;
  const wordsOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(headlineOpacity, { toValue: 1, duration: 460, useNativeDriver: true }),
          Animated.timing(headlineY, { toValue: 0, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        ])
      ]),
      Animated.sequence([
        Animated.delay(360),
        Animated.timing(wordsOpacity, { toValue: 1, duration: 420, useNativeDriver: true })
      ]),
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true })
        ])
      )
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
  }, [durationMs, headlineOpacity, headlineY, onComplete, progress, screenOpacity, shimmer, wordsOpacity]);

  const progressW = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <PremiumIntroBackground variant="story" />
        <View style={styles.center}>
          <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineY }] }}>
            <Text style={styles.headline}>Empowering Every Field Visit</Text>
          </Animated.View>
          <Animated.Text style={[styles.words, { opacity: wordsOpacity }]}>
            Track • Diagnose • Recommend • Grow
          </Animated.Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressW, opacity: shimmerOpacity }]} />
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
  headline: {
    color: AUTH_THEME.text,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 32,
    textAlign: "center"
  },
  words: {
    color: AUTH_THEME.neon,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 14,
    textAlign: "center",
    textTransform: "uppercase"
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.1)",
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
