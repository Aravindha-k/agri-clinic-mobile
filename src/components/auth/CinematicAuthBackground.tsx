import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";

/** Subtle full-screen backdrop — pointerEvents none, never blocks inputs. */
export function CinematicAuthBackground() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.base, { backgroundColor: AUTH_THEME.bg }]} />
      <View style={[styles.glow, { backgroundColor: AUTH_THEME.bgGlow }]} />
      <View style={styles.vignette} />
      <Ionicons name="leaf-outline" size={120} color="rgba(61,255,138,0.04)" style={styles.leafTL} />
      <Ionicons name="leaf-outline" size={90} color="rgba(61,255,138,0.03)" style={styles.leafBR} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  base: {
    ...StyleSheet.absoluteFillObject
  },
  glow: {
    bottom: 0,
    height: "70%",
    left: 0,
    opacity: 0.22,
    position: "absolute",
    right: 0
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_THEME.overlay
  },
  leafTL: {
    left: -20,
    position: "absolute",
    top: "8%"
  },
  leafBR: {
    bottom: "15%",
    position: "absolute",
    right: -10
  }
});
