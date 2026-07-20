import { useEffect } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { AgriProductIcon, AGRI_CLUSTER_ICONS, AGRI_ORBIT_ICONS } from "./agriProductIcons";
import { BRAND_ORBIT_GAP_RATIO } from "./brandHeaderSpacing";

const ORBIT_DURATION_MS = 10_000;
const ORBIT_CHIP_PADDING = 8;

/** Orbit gap in px from logo edge (20% of logo diameter by default). */
export function computeOrbitGap(diameter: number, gapRatio = BRAND_ORBIT_GAP_RATIO) {
  return diameter * gapRatio;
}

export function computeOrbitChipSize(
  diameter: number,
  compact = true,
  options?: { iconSizeOverride?: number; chipPad?: number }
) {
  const chipPad = options?.chipPad ?? (compact ? 6 : ORBIT_CHIP_PADDING);
  const iconSize =
    options?.iconSizeOverride ??
    Math.max(compact ? 24 : 28, Math.round(diameter * (compact ? 0.24 : 0.26)));
  return iconSize + chipPad * 2 + 2;
}

export function computeOrbitStageSize(
  diameter: number,
  options?: {
    gapRatio?: number;
    compact?: boolean;
    iconSizeOverride?: number;
    chipPad?: number;
    /** Chips travel on the ring — canvas = diameter + chip + edge pads (Today). */
    chipsOnTrack?: boolean;
    edgePad?: number;
  }
) {
  const gapRatio = options?.gapRatio ?? BRAND_ORBIT_GAP_RATIO;
  const gap = computeOrbitGap(diameter, gapRatio);
  const compact = options?.compact ?? true;
  const chipSize = computeOrbitChipSize(diameter, compact, {
    iconSizeOverride: options?.iconSizeOverride,
    chipPad: options?.chipPad
  });
  if (options?.chipsOnTrack) {
    const edge = options.edgePad ?? 5;
    return diameter + chipSize + edge * 2;
  }
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
  const wellSize = Math.min(chipSize - 4, iconSize + (iconSize <= 16 ? 6 : 10));
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
            width: wellSize,
            height: wellSize,
            borderRadius: wellSize / 2
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
  const motion = useAnimatedStyle(() => {
    const angle = animate ? rotation.value + phase : phase;
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
  minimalTrack = false,
  durationMs = ORBIT_DURATION_MS,
  /** Optional explicit glyph size (Today hero uses responsive sizing). */
  iconSizeOverride,
  /** Optional chip padding override (Today uses tighter pads). */
  chipPadOverride,
  /** Place chip centres on the ring so the full path fits diameter + chip + pads. */
  chipsOnTrack = false,
  edgePad = 5
}: {
  diameter: number;
  animate?: boolean;
  showTrack?: boolean;
  gapRatio?: number;
  compact?: boolean;
  minimalTrack?: boolean;
  durationMs?: number;
  iconSizeOverride?: number;
  chipPadOverride?: number;
  chipsOnTrack?: boolean;
  edgePad?: number;
}) {
  const chipPad = chipPadOverride ?? (compact ? 6 : ORBIT_CHIP_PADDING);
  const iconSize =
    iconSizeOverride ??
    Math.max(compact ? 24 : 28, Math.round(diameter * (compact ? 0.24 : 0.26)));
  const chipSize = iconSize + chipPad * 2 + 2;
  const logoRadius = diameter / 2;
  const gap = computeOrbitGap(diameter, gapRatio);
  // Orbit track on the ring; chips either on-track (Today) or outside (legacy).
  const trackRadius = logoRadius + gap;
  const chipRadius = chipsOnTrack ? trackRadius : trackRadius + chipSize * 0.5;
  const stage = computeOrbitStageSize(diameter, {
    gapRatio,
    compact,
    iconSizeOverride: iconSize,
    chipPad,
    chipsOnTrack,
    edgePad
  });
  const orbitPhaseOffset = Math.PI / 4;
  const rotation = useSharedValue(0);
  const trackCenter = stage / 2;

  useEffect(() => {
    if (!animate) {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }
    cancelAnimation(rotation);
    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(Math.PI * 2, { duration: durationMs, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(rotation);
  }, [animate, durationMs, rotation]);

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
