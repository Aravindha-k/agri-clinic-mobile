import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";

const LEAVES = [
  { name: "leaf-outline" as const, left: "12%" as const, top: "22%" as const, size: 18, delay: 0 },
  { name: "leaf" as const, right: "14%" as const, top: "30%" as const, size: 14, delay: 200 },
  { name: "flower-outline" as const, left: "20%" as const, bottom: "28%" as const, size: 16, delay: 400 }
];

/** Subtle drifting leaf accents for intro screens. */
export function FloatingLeaves() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      {LEAVES.map((leaf, i) => (
        <DriftingLeaf key={i} {...leaf} />
      ))}
    </View>
  );
}

type Percent = `${number}%`;

function DriftingLeaf({
  name,
  left,
  right,
  top,
  bottom,
  size,
  delay
}: {
  name: keyof typeof Ionicons.glyphMap;
  left?: Percent;
  right?: Percent;
  top?: Percent;
  bottom?: Percent;
  size: number;
  delay: number;
}) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 2400,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delay, drift]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const opacity = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.35, 0.15] });

  return (
    <Animated.View
      style={[
        styles.leaf,
        { left, right, top, bottom, opacity, transform: [{ translateY }] }
      ]}
    >
      <Ionicons name={name} size={size} color={AUTH_THEME.neon} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject
  },
  leaf: {
    position: "absolute"
  }
});
