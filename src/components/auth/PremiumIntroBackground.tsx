import { StyleSheet, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";
import { BRAND_COLORS } from "../../brand/constants";

type Variant = "brand" | "story";

/** Premium emerald gradient — no decorative circles or floating particles. */
export function PremiumIntroBackground({ variant = "brand" }: { variant?: Variant }) {
  const isStory = variant === "story";

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.base, { backgroundColor: AUTH_THEME.bg }]} />
      <View
        style={[
          styles.topGlow,
          {
            backgroundColor: isStory ? BRAND_COLORS.gradientMid : BRAND_COLORS.gradientDeep,
            opacity: isStory ? 0.42 : 0.28
          }
        ]}
      />
      <View
        style={[
          styles.bottomGlow,
          {
            backgroundColor: isStory ? BRAND_COLORS.gradientBottom : AUTH_THEME.bgMid,
            opacity: isStory ? 0.35 : 0.5
          }
        ]}
      />
      <View style={styles.vignette} />
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
  topGlow: {
    height: "52%",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  bottomGlow: {
    bottom: 0,
    height: "48%",
    left: 0,
    position: "absolute",
    right: 0
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 13, 10, 0.35)"
  }
});
