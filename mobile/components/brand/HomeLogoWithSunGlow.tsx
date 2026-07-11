import { StyleSheet, View } from "react-native";
import { BrandLogoBadge } from "./BrandLogoBadge";
import { HOME_LOGO_SUNSHINE_GLOW_ENABLED } from "./homeLogoExperiment";
import { SunGlow } from "./SunGlow";

type Props = {
  size: number;
  animated?: boolean;
  replayKey?: number | string;
};

/**
 * Home logo with optional experimental sunshine glow behind the mark.
 * Toggle off via `HOME_LOGO_SUNSHINE_GLOW_ENABLED` to restore prior look.
 */
export function HomeLogoWithSunGlow({ size, animated = false, replayKey = 0 }: Props) {
  if (!HOME_LOGO_SUNSHINE_GLOW_ENABLED) {
    return <BrandLogoBadge size={size} animated={animated} replayKey={replayKey} />;
  }

  const glowSize = Math.round(size * 1.85);

  return (
    <View style={styles.wrap}>
      <SunGlow size={glowSize} />
      <View style={styles.logoLayer}>
        {/* Logo mark stays still — glow carries the motion. */}
        <BrandLogoBadge size={size} animated={false} replayKey={replayKey} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
  },
  logoLayer: {
    zIndex: 2
  }
});
