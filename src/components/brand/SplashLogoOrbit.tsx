import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { logStartup } from "../../utils/startupDiagnostics";

const ORBIT_DURATION_MS = 2800;
const RING_FADE_MS = 420;

/** Champagne gold — high contrast on emerald splash. */
const GOLD = "#E8C872";
const GOLD_SOFT = "rgba(232, 200, 114, 0.86)";
const RING_WHITE = "rgba(255, 255, 255, 0.48)";

type Props = {
  /** Outer diameter of the orbit stage (must be larger than the logo). */
  size: number;
  left: number;
  top: number;
  /** When true, start the rotation loop (after cinematic first layout). */
  active: boolean;
  /** Delay before ring fades in / rotation starts (ms). */
  startDelayMs?: number;
  /** Reduced-motion: static soft ring only. */
  reducedMotion?: boolean;
};

/**
 * Premium splash orbit — thin rotating ring + glowing accent dot around the logo.
 * Renders behind the logo (caller z-order); must not cover the mark.
 */
export function SplashLogoOrbit({
  size,
  left,
  top,
  active,
  startDelayMs = 280,
  reducedMotion = false
}: Props) {
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  const ringStroke = useMemo(() => Math.max(2, size * 0.015), [size]);
  const inset = useMemo(() => size * 0.075, [size]);
  const trackR = useMemo(() => size / 2 - inset, [inset, size]);
  const dotSize = useMemo(() => Math.max(8, Math.round(size * 0.06)), [size]);

  useEffect(() => {
    if (!active) return;

    logStartup("ring_rendered", `size=${Math.round(size)}`);
    logStartup(
      "ring_layout",
      `left=${Math.round(left)} top=${Math.round(top)} d=${Math.round(size)}`
    );

    cancelAnimation(opacity);
    cancelAnimation(rotation);
    opacity.value = 0;
    rotation.value = 0;

    opacity.value = withDelay(
      startDelayMs,
      withTiming(1, { duration: RING_FADE_MS, easing: Easing.out(Easing.cubic) })
    );

    if (reducedMotion) {
      logStartup("ring_animation_started", "static_reduced_motion");
      return () => {
        cancelAnimation(opacity);
        logStartup("ring_animation_stopped", "reduced_motion_unmount");
      };
    }

    rotation.value = withDelay(
      startDelayMs,
      withRepeat(
        withTiming(360, { duration: ORBIT_DURATION_MS, easing: Easing.linear }),
        -1,
        false
      )
    );

    logStartup("ring_animation_started", `delay=${startDelayMs}ms period=${ORBIT_DURATION_MS}ms`);

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(rotation);
      logStartup("ring_animation_stopped", "unmount");
    };
  }, [active, left, opacity, reducedMotion, rotation, size, startDelayMs, top]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }]
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.stage,
        fadeStyle,
        {
          width: size,
          height: size,
          left,
          top,
          borderRadius: size / 2
        }
      ]}
      collapsable={false}
    >
      {/* Soft static halo */}
      <View
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringStroke
          }
        ]}
      />

      {/* Primary rotating dashed ring + traveling glow dot */}
      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={trackR}
            stroke={GOLD_SOFT}
            strokeWidth={ringStroke}
            strokeDasharray={`${Math.max(5, size * 0.045)} ${Math.max(7, size * 0.05)}`}
            fill="none"
            strokeLinecap="round"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={trackR - ringStroke * 2.5}
            stroke={RING_WHITE}
            strokeWidth={Math.max(1, ringStroke * 0.55)}
            fill="none"
          />
        </Svg>
        <View
          style={[
            styles.dotGlow,
            {
              width: dotSize * 2.4,
              height: dotSize * 2.4,
              borderRadius: (dotSize * 2.4) / 2,
              left: size / 2 - (dotSize * 2.4) / 2,
              top: inset - (dotSize * 2.4) / 2
            }
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              left: size / 2 - dotSize / 2,
              top: inset - dotSize / 2
            }
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    overflow: "visible",
    position: "absolute",
    zIndex: 2
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(232, 200, 114, 0.34)",
    backgroundColor: "transparent"
  },
  dotGlow: {
    backgroundColor: "rgba(245, 215, 142, 0.42)",
    position: "absolute"
  },
  dot: {
    backgroundColor: GOLD,
    elevation: 4,
    position: "absolute",
    shadowColor: "#F5D78E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6
  }
});
