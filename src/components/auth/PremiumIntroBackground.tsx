import { StyleSheet, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";
import { BRAND_COLORS } from "../../brand/constants";

type Variant = "brand" | "story";

/** Rich emerald gradient backdrop for splash and login. */
export function PremiumIntroBackground({ variant = "brand" }: { variant?: Variant }) {
  const isStory = variant === "story";

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.base, { backgroundColor: BRAND_COLORS.secondary }]} />
      <View
        style={[
          styles.radialTop,
          {
            backgroundColor: isStory ? BRAND_COLORS.gradientMid : BRAND_COLORS.gradientDeep,
            opacity: isStory ? 0.55 : 0.45
          }
        ]}
      />
      <View
        style={[
          styles.radialBottom,
          {
            backgroundColor: isStory ? BRAND_COLORS.gradientBottom : BRAND_COLORS.secondary,
            opacity: isStory ? 0.4 : 0.65
          }
        ]}
      />
      <View style={styles.accentLine} />
      <View style={styles.vignetteTop} />
      <View style={styles.vignetteBottom} />
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
  radialTop: {
    borderBottomLeftRadius: 280,
    borderBottomRightRadius: 280,
    height: "58%",
    left: "-10%",
    position: "absolute",
    right: "-10%",
    top: 0
  },
  radialBottom: {
    borderTopLeftRadius: 240,
    borderTopRightRadius: 240,
    bottom: 0,
    height: "42%",
    left: "-8%",
    position: "absolute",
    right: "-8%"
  },
  accentLine: {
    backgroundColor: "rgba(255,255,255,0.12)",
    height: 1,
    left: "12%",
    position: "absolute",
    right: "12%",
    top: "46%"
  },
  vignetteTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 8, 6, 0.25)"
  },
  vignetteBottom: {
    backgroundColor: "rgba(3, 8, 6, 0.55)",
    bottom: 0,
    height: "35%",
    left: 0,
    position: "absolute",
    right: 0
  }
});
