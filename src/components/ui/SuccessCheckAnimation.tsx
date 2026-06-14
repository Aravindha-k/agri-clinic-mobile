import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  queued?: boolean;
};

export function SuccessCheckAnimation({ queued }: Props) {
  const { colors } = useDesignSystem();
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ring, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true })
    ]).start();
  }, [opacity, ring, scale]);

  const bg = queued ? colors.warningSoft : colors.successSoft;
  const fg = queued ? colors.warning : colors.success;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: fg,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.35] }) }]
          }
        ]}
      />
      <Animated.View style={[styles.circle, { backgroundColor: bg, opacity, transform: [{ scale }] }]}>
        <Ionicons name={queued ? "cloud-upload" : "checkmark"} size={42} color={fg} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", height: 96, justifyContent: "center", width: 96 },
  ring: {
    borderRadius: 999,
    borderWidth: 2,
    height: 96,
    position: "absolute",
    width: 96
  },
  circle: {
    alignItems: "center",
    borderRadius: 999,
    height: 80,
    justifyContent: "center",
    width: 80
  }
});
