import { StyleSheet, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";
import { PremiumIntroBackground } from "./PremiumIntroBackground";

/** Subtle full-screen backdrop — pointerEvents none, never blocks inputs. */
export function CinematicAuthBackground() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <PremiumIntroBackground variant="brand" />
      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_THEME.overlay
  }
});
