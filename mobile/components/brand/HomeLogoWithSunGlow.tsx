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
 * Home logo with experimental sunshine glow (orbit disabled so glow is visible).
 * Toggle off via `HOME_LOGO_SUNSHINE_GLOW_ENABLED` to restore prior orbit logo.
 */
export function HomeLogoWithSunGlow({ size, animated = false, replayKey = 0 }: Props) {
  if (!HOME_LOGO_SUNSHINE_GLOW_ENABLED) {
    return <BrandLogoBadge size={size} animated={animated} replayKey={replayKey} />;
  }

  const glowSize = Math.round(size * 2.15);
  const stage = Math.max(glowSize, size + 24);

  return (
    <View style={[styles.wrap, { width: stage, height: stage }]}>
      <SunGlow size={glowSize} />
      <View style={styles.logoLayer}>
        <BrandLogoBadge
          size={size}
          animated={false}
          replayKey={replayKey}
          showOrbit={false}
        />
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
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  }
});
