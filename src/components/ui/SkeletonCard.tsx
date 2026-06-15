import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";

type Props = {
  height?: number;
  style?: ViewStyle;
};

export function SkeletonCard({ height = 100, style }: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-300, 300] });

  return (
    <View style={[styles.card, { height }, style]}>
      <Animated.View style={[styles.shimmerWrap, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.45)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmer}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden"
  },
  shimmerWrap: {
    height: "100%",
    width: 300
  },
  shimmer: {
    flex: 1
  }
});
