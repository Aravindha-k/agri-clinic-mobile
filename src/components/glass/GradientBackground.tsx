import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { GE_GRADIENT } from "../../theme/glassEmerald";

type Props = {
  children?: ReactNode;
  style?: ViewStyle;
};

export default function GradientBackground({ children, style }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <LinearGradient
        colors={[...GE_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.edgeGlowTop} />
      <View style={styles.edgeGlowBottom} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  edgeGlowTop: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 80,
    height: 160,
    left: "50%",
    marginLeft: -80,
    position: "absolute",
    top: -60,
    width: 160
  },
  edgeGlowBottom: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 75,
    bottom: -40,
    height: 150,
    position: "absolute",
    right: -30,
    width: 150
  }
});
