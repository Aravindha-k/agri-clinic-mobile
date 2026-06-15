import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { GE } from "../../theme/glassEmerald";

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export default function GlassPill({ label, active, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.08, speed: 40, bounciness: 10, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 6, useNativeDriver: true })
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.pill,
          active ? styles.pillActive : styles.pillInactive,
          { transform: [{ scale }] }
        ]}
      >
        <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  pillActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.55)"
  },
  pillInactive: {
    backgroundColor: GE.glassLight,
    borderColor: GE.glassBorderLight
  },
  label: {
    fontSize: 11,
    fontWeight: "700"
  },
  labelActive: {
    color: GE.white
  },
  labelInactive: {
    color: GE.textSecondary
  }
});
