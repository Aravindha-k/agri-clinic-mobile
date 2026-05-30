import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AUTH_THEME } from "../../theme/authTheme";
import { CinematicAuthBackground } from "./CinematicAuthBackground";
import { FloatingLeaves } from "./FloatingLeaves";

export const STORY_INTRO_MS = 1750;
const FADE_MS = 380;

type Props = {
  onComplete: () => void;
  durationMs?: number;
};

/** Agriculture mission beat — timed text + progress (~1.5–2s). */
export function AgriStoryStep({ onComplete, durationMs = STORY_INTRO_MS }: Props) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(18)).current;
  const wordsOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(headlineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(headlineY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        ])
      ]),
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(wordsOpacity, { toValue: 1, duration: 480, useNativeDriver: true })
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
  }, [durationMs, headlineOpacity, headlineY, onComplete, progress, screenOpacity, wordsOpacity]);

  const progressW = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <CinematicAuthBackground />
        <View style={styles.illustration} pointerEvents="none">
          <View style={styles.hill} />
          <View style={[styles.hill, styles.hillBack]} />
        </View>
        <FloatingLeaves />

        <View style={styles.center}>
          <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineY }] }}>
            <Text style={styles.headline}>Empowering Every Field Visit</Text>
          </Animated.View>
          <Animated.Text style={[styles.words, { opacity: wordsOpacity }]}>
            Track • Diagnose • Recommend • Grow
          </Animated.Text>
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
  illustration: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end"
  },
  hill: {
    backgroundColor: "rgba(21,122,76,0.35)",
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    height: "32%",
    marginHorizontal: -40
  },
  hillBack: {
    backgroundColor: "rgba(15,81,50,0.5)",
    height: "26%",
    marginBottom: 24,
    opacity: 0.85
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  headline: {
    color: AUTH_THEME.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
    textAlign: "center"
  },
  words: {
    color: AUTH_THEME.neon,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: 16,
    textAlign: "center",
    textTransform: "uppercase"
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
