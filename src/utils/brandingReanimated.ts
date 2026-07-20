import { Platform } from "react-native";
import {
  ReduceMotion,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type AnimationCallback,
  type AnimatableValue,
  type WithTimingConfig
} from "react-native-reanimated";
import type { PremiumMotionState } from "../hooks/usePremiumMotion";
import { isExplicitReducedMotion } from "../hooks/usePremiumMotion";

/**
 * Decorative branding (splash, login logo, Today orbit) may run on Android even
 * when Reanimated's native reduced-motion probe is true due to OEM animator-scale
 * defaults. AccessibilityInfo "Remove animations" still selects JS static fallback.
 */
export function shouldRunBrandingMotion(state: PremiumMotionState): boolean {
  if (!state.ready) return true;
  // Motorola Edge 60 (Android 36) reports AccessibilityInfo reduce-motion true due to
  // OEM animator-scale defaults — not user "Remove animations". Branding uses
  // ReduceMotion.Never so Reanimated still runs; only iOS respects explicit reduced.
  if (Platform.OS === "android") return true;
  return !isExplicitReducedMotion(state);
}

/** Override Reanimated System probe — branding only, not navigation/functional UI. */
export const BRANDING_REANIMATED_ACTIVE = ReduceMotion.Never;

/**
 * Real no-op so withRepeat's 5th arg (reduceMotion) is never shifted into the
 * callback slot when callers omit a completion callback.
 */
const BRANDING_REPEAT_NOOP: AnimationCallback = (_finished) => {
  "worklet";
};

/**
 * withTiming wrapper — never pass undefined as the callback argument.
 * reduceMotion is set on the config object only (never as a positional callback).
 */
export function brandingWithTiming<T extends AnimatableValue>(
  toValue: T,
  config?: WithTimingConfig,
  callback?: AnimationCallback
): T {
  const finalConfig: WithTimingConfig = {
    ...config,
    reduceMotion: BRANDING_REANIMATED_ACTIVE
  };
  if (typeof callback === "function") {
    return withTiming(toValue, finalConfig, callback);
  }
  return withTiming(toValue, finalConfig);
}

/**
 * withDelay — third arg is reduceMotion (not a callback). Safe to pass Never.
 */
export function brandingWithDelay<T extends AnimatableValue>(
  delayMs: number,
  delayedAnimation: T
): T {
  return withDelay(delayMs, delayedAnimation, BRANDING_REANIMATED_ACTIVE);
}

/**
 * withRepeat — ReduceMotion.Never must be the 5th argument, never the callback.
 *
 * When reduced motion is active, withRepeat stops after the first cycle unless
 * reduceMotion is Never. Passing `undefined` as callback then Never as 5th can
 * shift Never into the callback slot on the UI thread.
 */
export function brandingWithRepeat<T extends AnimatableValue>(
  animation: T,
  numberOfReps?: number,
  reverse?: boolean,
  callback?: AnimationCallback
): T {
  const safeCallback = typeof callback === "function" ? callback : BRANDING_REPEAT_NOOP;
  return withRepeat(animation, numberOfReps, reverse, safeCallback, BRANDING_REANIMATED_ACTIVE);
}

export function brandingWithSequence<T extends AnimatableValue>(...animations: T[]): T {
  return withSequence(...animations);
}

export { ReduceMotion };
