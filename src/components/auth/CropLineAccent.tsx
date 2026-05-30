import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

/** Subtle animated crop row — lightweight line segments, no particles. */
export function CropLineAccent() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  }, [progress]);

  const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] });
  const scaleX = progress.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ scaleX }] }]}>
      <View style={[styles.stem, styles.stemShort]} />
      <View style={[styles.stem, styles.stemTall]} />
      <View style={[styles.stem, styles.stemMid]} />
      <View style={[styles.stem, styles.stemTall]} />
      <View style={[styles.stem, styles.stemShort]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
    height: 22,
    justifyContent: "center",
    marginTop: 18
  },
  stem: {
    backgroundColor: "#3DFF8A",
    borderRadius: 2,
    width: 3
  },
  stemShort: { height: 10, opacity: 0.65 },
  stemMid: { height: 16 },
  stemTall: { height: 22 }
});
