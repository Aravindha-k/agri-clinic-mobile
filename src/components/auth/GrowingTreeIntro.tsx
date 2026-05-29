import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { TreeSvgArt } from "./TreeSvgArt";

export const INTRO_BG = "#E8EFE4";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
/** Tree occupies lower portion of screen, rooted at bottom edge. */
const TREE_HEIGHT = Math.min(SCREEN_H * 0.58, 420);
const PIVOT_Y = TREE_HEIGHT / 2;

type Props = {
  onGrowthComplete?: () => void;
};

/**
 * Realistic bottom-anchored tree: seed → scaleY reveal from soil (native-driver safe).
 */
export function GrowingTreeIntro({ onGrowthComplete }: Props) {
  const reveal = useRef(new Animated.Value(0)).current;
  const seedOpacity = useRef(new Animated.Value(0)).current;
  const seedScale = useRef(new Animated.Value(0.3)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const [seedVisible, setSeedVisible] = useState(true);

  const treeScaleY = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0.02, 1]
  });

  const treeScaleX = reveal.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.72, 0.88, 1]
  });

  const treeOpacity = reveal.interpolate({
    inputRange: [0, 0.08, 1],
    outputRange: [0, 1, 1]
  });

  const swayRotate = sway.interpolate({
    inputRange: [0, 1],
    outputRange: ["-0.6deg", "0.6deg"]
  });

  useEffect(() => {
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    swayLoop.start();

    const growth = Animated.sequence([
      Animated.parallel([
        Animated.timing(seedOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(seedScale, { toValue: 1, friction: 8, tension: 120, useNativeDriver: true })
      ]),
      Animated.delay(180),
      Animated.timing(reveal, {
        toValue: 1,
        duration: 2400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);

    growth.start(({ finished }) => {
      if (finished) onGrowthComplete?.();
    });

    const hideSeed = setTimeout(() => setSeedVisible(false), 520);

    return () => {
      growth.stop();
      swayLoop.stop();
      clearTimeout(hideSeed);
    };
  }, [onGrowthComplete, reveal, seedOpacity, seedScale, sway]);

  return (
    <View style={[styles.stage, { height: TREE_HEIGHT + 24 }]} pointerEvents="none">
      <View style={styles.groundLine} />

      {seedVisible ? (
        <Animated.View
          style={[
            styles.seedWrap,
            {
              opacity: seedOpacity,
              transform: [{ scale: seedScale }]
            }
          ]}
        >
          <View style={styles.seedOuter}>
            <View style={styles.seedInner} />
          </View>
        </Animated.View>
      ) : null}

      <View style={[styles.clip, { height: TREE_HEIGHT }]}>
        <Animated.View
          style={{
            height: TREE_HEIGHT,
            width: SCREEN_W,
            opacity: treeOpacity,
            transform: [
              { translateY: PIVOT_Y },
              { scaleY: treeScaleY },
              { translateY: -PIVOT_Y },
              { scaleX: treeScaleX }
            ]
          }}
        >
          <Animated.View style={{ flex: 1, transform: [{ rotate: swayRotate }] }}>
            <TreeSvgArt />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignSelf: "stretch",
    justifyContent: "flex-end",
    overflow: "hidden",
    width: "100%"
  },
  groundLine: {
    backgroundColor: "#A8B89E",
    borderRadius: 2,
    bottom: 0,
    height: 4,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 2
  },
  seedWrap: {
    alignSelf: "center",
    bottom: 10,
    position: "absolute",
    zIndex: 3
  },
  seedOuter: {
    backgroundColor: "#4E342E",
    borderRadius: 10,
    height: 16,
    justifyContent: "center",
    width: 12
  },
  seedInner: {
    alignSelf: "center",
    backgroundColor: "#3E2723",
    borderRadius: 6,
    height: 10,
    width: 8
  },
  clip: {
    alignSelf: "center",
    bottom: 4,
    overflow: "hidden",
    position: "absolute",
    width: SCREEN_W
  }
});
