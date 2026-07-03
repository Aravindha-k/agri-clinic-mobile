import { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { AgriProductIcon, type BrandFlankService } from "./agriProductIcons";

const FLOAT_MS = 2200;

type FlankProps = {
  flank: BrandFlankService;
  animate: boolean;
  delayMs?: number;
};

function ServiceFlankSeal({ flank, animate, delayMs = 0 }: FlankProps) {
  const { reduced } = usePremiumMotion();
  const drift = useSharedValue(0);
  const shouldAnimate = animate && !reduced;

  useEffect(() => {
    if (!shouldAnimate) {
      drift.value = 0;
      return;
    }
    drift.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: FLOAT_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(3, { duration: FLOAT_MS, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [delayMs, drift, shouldAnimate]);

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value }, { rotate: `${flank.tiltDeg}deg` }]
  }));

  const isLeft = flank.side === "left";

  return (
    <Animated.View
      style={[styles.sealWrap, isLeft ? styles.sealLeft : styles.sealRight, motion]}
      accessibilityLabel={flank.icon.service}
    >
      <View
        style={[
          styles.seal,
          isLeft ? styles.sealShapeLeft : styles.sealShapeRight,
          { borderColor: flank.accentSoft, backgroundColor: "rgba(255,255,255,0.94)" }
        ]}
      >
        <View style={[styles.accentRail, { backgroundColor: flank.accent }, isLeft ? styles.railLeft : styles.railRight]} />
        <Text style={[styles.stamp, { color: flank.accent }]}>{flank.stamp}</Text>
        <View style={[styles.iconWell, { backgroundColor: flank.accentSoft }]}>
          <AgriProductIcon icon={flank.icon} size={18} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {flank.label}
        </Text>
        <View style={[styles.notch, { borderColor: flank.accent }, isLeft ? styles.notchLeft : styles.notchRight]} />
      </View>
    </Animated.View>
  );
}

type ArcProps = {
  logoRadius: number;
  flankOffsetY: number;
  stageWidth: number;
};

/** Organic vine arcs linking clinic seals to the hero logo ring. */
function FlankGrowthArcs({ logoRadius, flankOffsetY, stageWidth }: ArcProps) {
  const midY = flankOffsetY;
  const centerX = stageWidth / 2;
  const ring = logoRadius + 6;
  const leftEnd = centerX - ring * 0.55;
  const rightStart = centerX + ring * 0.55;
  const leftStart = 52;
  const rightEnd = stageWidth - 52;

  const leftPath = `M ${leftStart} ${midY + 4} C ${leftStart + 22} ${midY - 16}, ${leftEnd - 18} ${midY - 6}, ${leftEnd} ${midY}`;
  const rightPath = `M ${rightStart} ${midY} C ${rightStart + 18} ${midY - 6}, ${rightEnd - 22} ${midY - 16}, ${rightEnd} ${midY + 4}`;

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width={stageWidth}
      height={midY + 36}
    >
      <Path
        d={leftPath}
        stroke="rgba(15, 107, 67, 0.22)"
        strokeWidth={1.2}
        strokeDasharray="3 4"
        fill="none"
      />
      <Path d={leftPath} stroke="rgba(15, 107, 67, 0.08)" strokeWidth={3} fill="none" />
      <Path
        d={rightPath}
        stroke="rgba(26, 107, 124, 0.22)"
        strokeWidth={1.2}
        strokeDasharray="3 4"
        fill="none"
      />
      <Path d={rightPath} stroke="rgba(26, 107, 124, 0.08)" strokeWidth={3} fill="none" />
      <Circle cx={leftEnd} cy={midY} r={2.5} fill="rgba(15, 107, 67, 0.35)" />
      <Circle cx={rightStart} cy={midY} r={2.5} fill="rgba(26, 107, 124, 0.35)" />
    </Svg>
  );
}

type ClusterFlanksProps = {
  flanks: BrandFlankService[];
  logoSize: number;
  stageWidth: number;
  animate?: boolean;
  stageHeight: number;
};

export function BrandServiceFlanks({
  flanks,
  logoSize,
  stageWidth,
  animate = true,
  stageHeight
}: ClusterFlanksProps) {
  const left = flanks.find((f) => f.side === "left");
  const right = flanks.find((f) => f.side === "right");
  const flankOffsetY = stageHeight / 2;

  return (
    <View pointerEvents="none" style={[styles.row, { width: stageWidth, height: stageHeight }]}>
      <FlankGrowthArcs logoRadius={logoSize / 2} flankOffsetY={flankOffsetY} stageWidth={stageWidth} />
      {left ? <ServiceFlankSeal flank={left} animate={animate} delayMs={0} /> : <View style={styles.flankSlot} />}
      <View style={{ width: logoSize }} />
      {right ? <ServiceFlankSeal flank={right} animate={animate} delayMs={400} /> : <View style={styles.flankSlot} />}
    </View>
  );
}

const SEAL_W = 56;
const SEAL_H = 76;

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    position: "absolute",
    zIndex: 3
  },
  flankSlot: {
    width: SEAL_W
  },
  sealWrap: {
    width: SEAL_W
  },
  sealLeft: {
    marginRight: 2
  },
  sealRight: {
    marginLeft: 2
  },
  seal: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    height: SEAL_H,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 8,
    width: SEAL_W,
    ...Platform.select({
      ios: {
        shadowColor: "#0A3D28",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5
      },
      default: { elevation: 2 }
    })
  },
  sealShapeLeft: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 16
  },
  sealShapeRight: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 8
  },
  accentRail: {
    bottom: 10,
    position: "absolute",
    top: 10,
    width: 3
  },
  railLeft: {
    borderBottomLeftRadius: 2,
    borderTopLeftRadius: 2,
    left: 0
  },
  railRight: {
    borderBottomRightRadius: 2,
    borderTopRightRadius: 2,
    right: 0
  },
  stamp: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 4
  },
  iconWell: {
    alignItems: "center",
    borderRadius: 99,
    height: 32,
    justifyContent: "center",
    marginBottom: 4,
    width: 32
  },
  label: {
    color: "#3D5C4A",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2
  },
  notch: {
    borderRadius: 99,
    borderWidth: 1,
    height: 6,
    position: "absolute",
    width: 6
  },
  notchLeft: {
    right: -3,
    top: "46%"
  },
  notchRight: {
    left: -3,
    top: "46%"
  }
});
