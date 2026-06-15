import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GE } from "../../theme/glassEmerald";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
};

export default function GlassButton({ label, onPress, loading, icon, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [loading, spinAnim]);

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.btn, { transform: [{ scale }], opacity: disabled ? 0.6 : 1 }]}>
        {loading ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <ActivityIndicator color={GE.g1} size="small" />
          </Animated.View>
        ) : icon ? (
          <Ionicons name={icon} size={18} color={GE.g1} />
        ) : null}
        <Text style={styles.label}>{loading ? "Please wait…" : label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    backgroundColor: GE.whiteHigh,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    height: 50,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10
  },
  label: {
    color: GE.g1,
    fontSize: 15,
    fontWeight: "700"
  }
});
