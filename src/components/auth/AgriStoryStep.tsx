import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";
import { AuthScreenLayout } from "./AuthScreenLayout";

export const STORY_INTRO_MS = 1800;
const FADE_MS = 350;

type Props = {
  onComplete: () => void;
  durationMs?: number;
};

export function AgriStoryStep({ onComplete, durationMs = STORY_INTRO_MS }: Props) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(14)).current;
  const wordsOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.35, duration: 800, useNativeDriver: true })
      ])
    ).start();

    Animated.parallel([
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(headlineOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
          Animated.timing(headlineY, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        ])
      ]),
      Animated.sequence([
        Animated.delay(380),
        Animated.timing(wordsOpacity, { toValue: 1, duration: 440, useNativeDriver: true })
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
  }, [durationMs, headlineOpacity, headlineY, onComplete, progress, screenOpacity, shimmer, wordsOpacity]);

  const progressW = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]}>
      <AuthScreenLayout variant="story" contentStyle={styles.center}>
        <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineY }] }}>
          <Text style={styles.headline}>Empowering Every Field Visit</Text>
        </Animated.View>
        <Animated.Text style={[styles.words, { opacity: wordsOpacity }]}>
          Track • Diagnose • Recommend • Grow
        </Animated.Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressW, opacity: shimmer }]} />
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
  headline: {
    color: AUTH_THEME.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
    textAlign: "center"
  },
  words: {
    color: AUTH_THEME.neon,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginTop: 16,
    textAlign: "center",
    textTransform: "uppercase"
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 3,
    height: 4,
    marginTop: 36,
    overflow: "hidden",
    width: 220
  },
  progressFill: {
    backgroundColor: AUTH_THEME.neon,
    borderRadius: 3,
    height: 4
  }
});
