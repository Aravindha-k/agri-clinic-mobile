import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme";
import { radius } from "../../theme/radius";

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const c = theme.colors;

  return (
    <Animated.View style={[styles.card, { backgroundColor: c.card, opacity }]}>
      <View style={[styles.line, styles.titleLine, { backgroundColor: c.skeleton }]} />
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={[styles.line, { backgroundColor: c.skeleton, width: i === lines - 1 ? "60%" : "90%" }]} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    gap: 10,
    marginBottom: 12,
    padding: 16
  },
  line: { borderRadius: 6, height: 12 },
  titleLine: { height: 16, marginBottom: 4, width: "45%" }
});
