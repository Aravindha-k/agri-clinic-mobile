import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { BRAND_COLORS } from "../../config/brand";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  /** 0–1 */
  progress: number;
  height?: number;
  style?: ViewStyle;
  trackColor?: string;
};

export function NeonProgressBar({
  progress,
  height = 4,
  style,
  trackColor = "rgba(15,81,50,0.12)"
}: Props) {
  const { enabled } = usePremiumMotion();
  const dotScale = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(0.9)).current;

  const pct = Math.min(1, Math.max(0, progress));
  const widthPct = `${Math.max(pct * 100, pct > 0 ? 4 : 0)}%`;

  useEffect(() => {
    if (!enabled || pct <= 0) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(dotScale, { toValue: 1.15, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(dotScale, { toValue: 0.9, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(dotOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 0.6, duration: 450, useNativeDriver: true })
        ])
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      dotScale.stopAnimation();
      dotOpacity.stopAnimation();
    };
  }, [dotOpacity, dotScale, enabled, pct]);

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }, style]}>
      <View style={[styles.fillWrap, { width: widthPct as `${number}%`, height }]}>
        {enabled ? (
          <LinearGradient
            colors={[BRAND_COLORS.secondary, BRAND_COLORS.primary, "#4caf82"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND_COLORS.primary, borderRadius: height / 2 }]} />
        )}
        {enabled && pct > 0 ? (
          <Animated.View
            style={[
              styles.dot,
              {
                width: height + 4,
                height: height + 4,
                borderRadius: (height + 4) / 2,
                right: -(height + 4) / 2 + 1,
                top: -2,
                opacity: dotOpacity,
                transform: [{ scale: dotScale }]
              }
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
    width: "100%"
  },
  fillWrap: {
    overflow: "visible",
    position: "relative"
  },
  dot: {
    backgroundColor: "#ffffff",
    position: "absolute",
    shadowColor: BRAND_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3
  }
});
