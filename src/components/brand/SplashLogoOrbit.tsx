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

const ORBIT_DURATION_MS = 2200;
const RING_FADE_MS = 420;

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
 * Reanimated `withRepeat` rotation (not Lottie / RN Animated).
 */
export function SplashLogoOrbit({
  size,
  left,
  top,
  active,
  startDelayMs = 300,
  reducedMotion = false
}: Props) {
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const counterRotation = useSharedValue(0);

  const ringStroke = useMemo(() => Math.max(1.5, size * 0.012), [size]);
  const inset = useMemo(() => size * 0.06, [size]);
  const trackR = useMemo(() => size / 2 - inset, [inset, size]);
  const dotSize = useMemo(() => Math.max(7, Math.round(size * 0.055)), [size]);

  useEffect(() => {
    if (!active) return;

    logStartup("ring_rendered", `size=${Math.round(size)}`);
    logStartup(
      "ring_layout",
      `left=${Math.round(left)} top=${Math.round(top)} d=${Math.round(size)}`
    );

    cancelAnimation(opacity);
    cancelAnimation(rotation);
    cancelAnimation(counterRotation);
    opacity.value = 0;
    rotation.value = 0;
    counterRotation.value = 0;

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

    // Kick rotation after the same delay so the ring is on-screen when motion starts.
    rotation.value = withDelay(
      startDelayMs,
      withRepeat(
        withTiming(360, { duration: ORBIT_DURATION_MS, easing: Easing.linear }),
        -1,
        false
      )
    );
    counterRotation.value = withDelay(
      startDelayMs,
      withRepeat(
        withTiming(-360, { duration: ORBIT_DURATION_MS * 1.35, easing: Easing.linear }),
        -1,
        false
      )
    );

    logStartup("ring_animation_started", `delay=${startDelayMs}ms period=${ORBIT_DURATION_MS}ms`);

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(rotation);
      cancelAnimation(counterRotation);
      logStartup("ring_animation_stopped", "unmount");
    };
  }, [active, counterRotation, left, opacity, reducedMotion, rotation, size, startDelayMs, top]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }]
  }));

  const counterSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${counterRotation.value}deg` }]
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
      {/* Soft outer halo (static) */}
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

      {/* Primary rotating dashed ring */}
      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={trackR}
            stroke="rgba(15, 81, 50, 0.42)"
            strokeWidth={ringStroke}
            strokeDasharray={`${Math.max(4, size * 0.04)} ${Math.max(6, size * 0.055)}`}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
        {/* Glowing orbit accent */}
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

      {/* Secondary thin counter-rotating highlight */}
      {!reducedMotion ? (
        <Animated.View style={[StyleSheet.absoluteFill, counterSpinStyle]}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={trackR - ringStroke * 3}
              stroke="rgba(212, 184, 106, 0.55)"
              strokeWidth={Math.max(1, ringStroke * 0.7)}
              strokeDasharray={`${Math.max(10, size * 0.12)} ${Math.max(40, size * 0.55)}`}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      ) : null}
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
    borderColor: "rgba(15, 107, 67, 0.18)",
    backgroundColor: "transparent"
  },
  dot: {
    backgroundColor: "#E8C872",
    elevation: 3,
    position: "absolute",
    shadowColor: "#F5D78E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5
  }
});
