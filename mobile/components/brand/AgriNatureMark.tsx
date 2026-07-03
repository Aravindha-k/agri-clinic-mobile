import { useEffect } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { AgriProductIcon, AGRI_CLUSTER_ICONS, AGRI_ORBIT_ICONS } from "./agriProductIcons";

const ORBIT_DURATION_MS = 28_000;
const ORBIT_CHIP_PADDING = 8;

type OrbitIcon = (typeof AGRI_ORBIT_ICONS)[number];

type Props = {
  size: number;
  variant?: "hero" | "cluster";
  style?: StyleProp<ViewStyle>;
};

function RoundIconChip({
  icon,
  iconSize,
  chipSize
}: {
  icon: OrbitIcon;
  iconSize: number;
  chipSize: number;
}) {
  return (
    <View
      accessibilityLabel={icon.service}
      style={[
        styles.iconChip,
        {
          width: chipSize,
          height: chipSize,
          borderRadius: chipSize / 2,
          borderColor: `${icon.color}44`
        }
      ]}
    >
      <View
        style={[
          styles.iconWell,
          {
            width: iconSize + 10,
            height: iconSize + 10,
            borderRadius: (iconSize + 10) / 2
          }
        ]}
      >
        <AgriProductIcon icon={icon} size={iconSize} />
      </View>
    </View>
  );
}

/** Service glyphs when no logo asset — inspection, seed, protection, fertilizer. */
export function AgriNatureMark({ size, style }: Props) {
  const mainIcon = Math.round(size * 0.3);
  const subIcon = Math.round(size * 0.18);
  const mainChip = mainIcon + ORBIT_CHIP_PADDING * 2 + 4;
  const subChip = subIcon + ORBIT_CHIP_PADDING * 2 + 4;
  const [inspection, seed, protection, fertilizer] = AGRI_CLUSTER_ICONS;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <View style={[styles.glyph, { top: size * 0.06, left: size * 0.3 }]}>
        <RoundIconChip icon={inspection} iconSize={mainIcon} chipSize={mainChip} />
      </View>
      <View style={[styles.glyph, { bottom: size * 0.1, right: size * 0.1 }]}>
        <RoundIconChip icon={seed} iconSize={subIcon} chipSize={subChip} />
      </View>
      <View style={[styles.glyph, { bottom: size * 0.12, left: size * 0.08 }]}>
        <RoundIconChip icon={protection} iconSize={subIcon} chipSize={subChip} />
      </View>
      <View style={[styles.glyph, { top: size * 0.1, right: size * 0.08 }]}>
        <RoundIconChip icon={fertilizer} iconSize={subIcon} chipSize={subChip} />
      </View>
    </View>
  );
}

function OrbitGlyph({
  icon,
  iconSize,
  chipSize,
  phase,
  radius,
  rotation
}: {
  icon: OrbitIcon;
  iconSize: number;
  chipSize: number;
  phase: number;
  radius: number;
  rotation: SharedValue<number>;
}) {
  const motion = useAnimatedStyle(() => {
    const angle = rotation.value + phase;
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius }
      ]
    };
  });

  return (
    <Animated.View style={[styles.orbitGlyph, motion]}>
      <RoundIconChip icon={icon} iconSize={iconSize} chipSize={chipSize} />
    </Animated.View>
  );
}

/** Four service icons orbiting the Today hero logo. */
export function AgriNatureOrbit({
  diameter,
  animate = true,
  showTrack = false
}: {
  diameter: number;
  animate?: boolean;
  showTrack?: boolean;
}) {
  const iconSize = Math.max(15, Math.round(diameter * 0.13));
  const chipSize = iconSize + ORBIT_CHIP_PADDING * 2 + 2;
  const radius = diameter / 2 + chipSize * 0.5;
  const stage = diameter + chipSize * 2 + 32;
  const orbitPhaseOffset = Math.PI / 4;
  const rotation = useSharedValue(0);
  const trackCenter = stage / 2;

  useEffect(() => {
    if (!animate) {
      rotation.value = 0;
      return;
    }
    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(Math.PI * 2, { duration: ORBIT_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, [animate, rotation]);

  return (
    <View pointerEvents="none" style={[styles.orbitStage, { width: stage, height: stage }]}>
      {showTrack ? (
        <Svg width={stage} height={stage} style={styles.orbitTrack}>
          <Circle
            cx={trackCenter}
            cy={trackCenter}
            r={radius}
            stroke="rgba(46, 155, 100, 0.32)"
            strokeWidth={1.5}
            strokeDasharray="5 7"
            fill="none"
          />
        </Svg>
      ) : null}
      <View style={styles.orbitOrigin}>
        {AGRI_ORBIT_ICONS.map((icon, index) => (
          <OrbitGlyph
            key={icon.key}
            icon={icon}
            iconSize={iconSize}
            chipSize={chipSize}
            phase={(index / AGRI_ORBIT_ICONS.length) * Math.PI * 2 - Math.PI / 2 + orbitPhaseOffset}
            radius={radius}
            rotation={rotation}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative"
  },
  glyph: {
    position: "absolute"
  },
  iconChip: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0A3D28",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 6
      },
      default: { elevation: 3 }
    })
  },
  iconWell: {
    alignItems: "center",
    backgroundColor: "rgba(247, 251, 248, 0.95)",
    justifyContent: "center"
  },
  orbitStage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
    zIndex: 1
  },
  orbitTrack: {
    ...StyleSheet.absoluteFillObject
  },
  orbitOrigin: {
    alignItems: "center",
    height: 0,
    justifyContent: "center",
    width: 0
  },
  orbitGlyph: {
    position: "absolute"
  }
});
