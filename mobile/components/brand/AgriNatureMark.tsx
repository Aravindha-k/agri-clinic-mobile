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
import { BRAND_ORBIT_GAP_RATIO } from "./brandHeaderSpacing";

const ORBIT_DURATION_MS = 28_000;
const ORBIT_CHIP_PADDING = 8;

/** Orbit gap in px from logo edge (20% of logo diameter by default). */
export function computeOrbitGap(diameter: number, gapRatio = BRAND_ORBIT_GAP_RATIO) {
  return diameter * gapRatio;
}

export function computeOrbitChipSize(diameter: number, compact = true) {
  const chipPad = compact ? 5 : ORBIT_CHIP_PADDING;
  const iconSize = Math.max(
    compact ? 12 : 15,
    Math.round(diameter * (compact ? 0.1 : 0.13))
  );
  return iconSize + chipPad * 2 + 2;
}

export function computeOrbitStageSize(
  diameter: number,
  options?: { gapRatio?: number; compact?: boolean }
) {
  const gapRatio = options?.gapRatio ?? BRAND_ORBIT_GAP_RATIO;
  const gap = computeOrbitGap(diameter, gapRatio);
  const compact = options?.compact ?? true;
  const chipSize = computeOrbitChipSize(diameter, compact);
  return diameter + chipSize * 2 + gap * 2 + (compact ? 8 : 32);
}

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
          borderColor: `${icon.color}66`
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
  rotation,
  animate
}: {
  icon: OrbitIcon;
  iconSize: number;
  chipSize: number;
  phase: number;
  radius: number;
  rotation: SharedValue<number>;
  animate: boolean;
}) {
  if (!animate) {
    const x = Math.cos(phase) * radius;
    const y = Math.sin(phase) * radius;
    return (
      <View style={[styles.orbitGlyph, { transform: [{ translateX: x }, { translateY: y }] }]}>
        <RoundIconChip icon={icon} iconSize={iconSize} chipSize={chipSize} />
      </View>
    );
  }

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
  showTrack = false,
  /** Gap from logo edge as a ratio of logo diameter (0.1 = 10%). */
  gapRatio = BRAND_ORBIT_GAP_RATIO,
  /** Tighter chips for a compact orbit band. */
  compact = false,
  /** Single dashed ring — used on Home hero. */
  minimalTrack = false
}: {
  diameter: number;
  animate?: boolean;
  showTrack?: boolean;
  gapRatio?: number;
  compact?: boolean;
  minimalTrack?: boolean;
}) {
  const chipPad = compact ? 5 : ORBIT_CHIP_PADDING;
  const iconSize = Math.max(
    compact ? 12 : 15,
    Math.round(diameter * (compact ? 0.1 : 0.13))
  );
  const chipSize = iconSize + chipPad * 2 + 2;
  const logoRadius = diameter / 2;
  const gap = computeOrbitGap(diameter, gapRatio);
  // Orbit track and chips run 20% of logo diameter away from the filled logo edge.
  const trackRadius = logoRadius + gap;
  const chipRadius = logoRadius + gap + chipSize * 0.5;
  const stage = computeOrbitStageSize(diameter, { gapRatio, compact });
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
          {minimalTrack ? (
            <>
              <Circle
                cx={trackCenter}
                cy={trackCenter}
                r={trackRadius}
                stroke="rgba(15, 107, 67, 0.22)"
                strokeWidth={Math.max(2, diameter * 0.02)}
                fill="none"
              />
              <Circle
                cx={trackCenter}
                cy={trackCenter}
                r={trackRadius}
                stroke="rgba(184, 148, 58, 0.78)"
                strokeWidth={Math.max(1.5, diameter * 0.014)}
                strokeDasharray={`${Math.max(4, Math.round(diameter * 0.04))} ${Math.max(6, Math.round(diameter * 0.05))}`}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <Circle
                cx={trackCenter}
                cy={trackCenter}
                r={trackRadius}
                stroke="rgba(15, 107, 67, 0.1)"
                strokeWidth={Math.max(2.5, diameter * 0.028)}
                fill="none"
              />
              <Circle
                cx={trackCenter}
                cy={trackCenter}
                r={trackRadius}
                stroke="rgba(15, 107, 67, 0.42)"
                strokeWidth={Math.max(1.25, diameter * 0.012)}
                strokeDasharray={`${Math.max(3, Math.round(diameter * 0.035))} ${Math.max(5, Math.round(diameter * 0.055))}`}
                strokeLinecap="round"
                fill="none"
              />
              <Circle
                cx={trackCenter}
                cy={trackCenter}
                r={trackRadius}
                stroke="rgba(212, 184, 106, 0.38)"
                strokeWidth={Math.max(1, diameter * 0.01)}
                strokeDasharray={`${Math.max(18, Math.round(diameter * 0.22))} ${Math.max(90, Math.round(diameter * 1.4))}`}
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
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
            radius={chipRadius}
            rotation={rotation}
            animate={animate}
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
    borderWidth: 1.5,
    justifyContent: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0A3D28",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 5
      },
      default: { elevation: 4 }
    })
  },
  iconWell: {
    alignItems: "center",
    backgroundColor: "rgba(248, 252, 249, 0.98)",
    justifyContent: "center"
  },
  orbitStage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
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
