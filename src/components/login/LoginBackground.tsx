import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { BRAND_COLORS } from "../../brand/constants";

/** Full-screen brand gradient + agriculture decor (colors match native splash). */
export function LoginBackground() {
  return (
    <>
      <View pointerEvents="none" style={[styles.base, { backgroundColor: BRAND_COLORS.gradientTop }]} />
      <View pointerEvents="none" style={[styles.midGlow, { backgroundColor: BRAND_COLORS.gradientMid }]} />
      <View pointerEvents="none" style={[styles.bottomGlow, { backgroundColor: BRAND_COLORS.gradientBottom }]} />
      <View pointerEvents="none" style={[styles.deepAccent, { backgroundColor: BRAND_COLORS.gradientDeep }]} />
      <View style={styles.decor} pointerEvents="none">
        <View style={styles.circleA} />
        <View style={styles.circleB} />
        <Ionicons name="leaf-outline" size={130} color="rgba(255,255,255,0.06)" style={styles.leafA} />
        <Ionicons name="leaf" size={68} color="rgba(255,255,255,0.05)" style={styles.leafB} />
        <View style={styles.fieldCurve} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject
  },
  midGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.38
  },
  bottomGlow: {
    bottom: 0,
    height: "72%",
    left: 0,
    opacity: 0.55,
    position: "absolute",
    right: 0
  },
  deepAccent: {
    bottom: 0,
    height: "28%",
    left: 0,
    opacity: 0.22,
    position: "absolute",
    right: 0
  },
  decor: {
    ...StyleSheet.absoluteFillObject
  },
  circleA: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    height: 240,
    position: "absolute",
    right: -80,
    top: -50,
    width: 240
  },
  circleB: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    height: 160,
    left: -60,
    position: "absolute",
    top: 140,
    width: 160
  },
  leafA: {
    position: "absolute",
    right: -24,
    top: 64
  },
  leafB: {
    left: 4,
    position: "absolute",
    top: 220
  },
  fieldCurve: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    bottom: 0,
    height: 100,
    left: -48,
    position: "absolute",
    right: -48
  }
});
