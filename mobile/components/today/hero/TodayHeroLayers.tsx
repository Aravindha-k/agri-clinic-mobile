import { StyleSheet, View } from "react-native";
import { TodayHeroContourPattern } from "./TodayHeroContourPattern";
import { TodayHeroCropRows } from "./TodayHeroCropRows";
import { TodayHeroFarmLandscape } from "./TodayHeroFarmLandscape";
import { TodayHeroFloatingLeaves } from "./TodayHeroFloatingLeaves";
import { TodayHeroLogoGlow } from "./TodayHeroLogoGlow";
import { TodayHeroWarmGradient } from "./TodayHeroWarmGradient";

/**
 * Layered Today hero decor — gradient, contours, landscape, glow, leaves.
 * Each layer is absolutely positioned; no baked background image.
 */
export function TodayHeroLayers() {
  return (
    <View style={styles.stack} pointerEvents="none">
      <TodayHeroWarmGradient />
      <TodayHeroContourPattern />
      <TodayHeroLogoGlow />
      <TodayHeroFarmLandscape />
      <TodayHeroCropRows />
      <TodayHeroFloatingLeaves />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden"
  }
});
