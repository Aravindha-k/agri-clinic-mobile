import { useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { GrowingTreeIntro, INTRO_BG } from "./GrowingTreeIntro";

const HOLD_MS = 700;
const FADE_MS = 500;

type Props = {
  onComplete: () => void;
};

/** Full-screen intro: realistic tree grows from bottom, no text. */
export function AuthIntroView({ onComplete }: Props) {
  const insets = useSafeAreaInsetsCompat();
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const growthDone = useRef(false);

  function finishIntro() {
    if (growthDone.current) return;
    growthDone.current = true;
    setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) onComplete();
      });
    }, HOLD_MS);
  }

  return (
    <Animated.View
      style={[styles.screen, { backgroundColor: INTRO_BG, opacity: screenOpacity, paddingBottom: insets.bottom }]}
      pointerEvents="none"
    >
      {/* Soft sky wash */}
      <View style={styles.skyWash} pointerEvents="none" />

      {/* Tree rooted at bottom of screen */}
      <View style={styles.treeAnchor}>
        <GrowingTreeIntro onGrowthComplete={finishIntro} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 10
  },
  skyWash: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
    height: "45%",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  treeAnchor: {
    justifyContent: "flex-end",
    width: "100%"
  }
});
