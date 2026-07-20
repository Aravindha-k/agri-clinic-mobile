import {
  ReduceMotion,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type AnimationCallback,
  type WithTimingConfig
} from "react-native-reanimated";
import type { PremiumMotionState } from "../hooks/usePremiumMotion";
import { isExplicitReducedMotion, shouldRunCoreMotion } from "../hooks/usePremiumMotion";

/**
 * Decorative branding (splash, login logo, Today orbit) may run on Android even
 * when Reanimated's native reduced-motion probe is true due to OEM animator-scale
 * defaults. AccessibilityInfo "Remove animations" still selects JS static fallback.
 */
export function shouldRunBrandingMotion(state: PremiumMotionState): boolean {
  return shouldRunCoreMotion(state) && !isExplicitReducedMotion(state);
}

/** Override Reanimated System probe — branding only, not navigation/functional UI. */
export const BRANDING_REANIMATED_ACTIVE = ReduceMotion.Never;

export function brandingWithTiming(
  toValue: number,
  config?: WithTimingConfig,
  callback?: AnimationCallback
) {
  return withTiming(toValue, { ...config, reduceMotion: BRANDING_REANIMATED_ACTIVE }, callback);
}

export function brandingWithDelay(delayMs: number, delayedAnimation: number) {
  return withDelay(delayMs, delayedAnimation, BRANDING_REANIMATED_ACTIVE);
}

export function brandingWithRepeat(
  animation: number,
  numberOfReps?: number,
  reverse?: boolean,
  callback?: AnimationCallback
) {
  return withRepeat(animation, numberOfReps, reverse, callback, BRANDING_REANIMATED_ACTIVE);
}

export function brandingWithSequence(...animations: number[]) {
  return withSequence(...animations);
}

export { ReduceMotion };
