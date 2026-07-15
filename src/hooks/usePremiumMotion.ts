import * as Battery from "expo-battery";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export type PremiumMotionState = {
  /** Accessibility and power preferences have been resolved at least once. */
  ready: boolean;
  /**
   * Heavy decorative effects only (particles, Lottie, glass sheen, splash golden dust).
   * May be off during battery saver — core logo/screen motion still runs.
   */
  enabled: boolean;
  /** User or system prefers reduced motion — disables all motion. */
  reduced: boolean;
  /** Core UI motion (screen entrances, logo zoom, splash orbit). Inverse of `reduced`. */
  coreMotion: boolean;
};

let cachedState: PremiumMotionState | null = null;

const BATTERY_SUPPORTED =
  Platform.OS !== "web" &&
  typeof Battery.isLowPowerModeEnabledAsync === "function" &&
  typeof Battery.addLowPowerModeListener === "function";

function buildMotionState(
  reduced: boolean,
  batterySaver: boolean,
  ready = true
): PremiumMotionState {
  const heavyEffects = !reduced && !batterySaver;
  return {
    ready,
    reduced,
    enabled: heavyEffects,
    coreMotion: !reduced
  };
}

async function resolveMotionState(): Promise<PremiumMotionState> {
  let reduced = false;
  try {
    reduced = await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    reduced = false;
  }

  let batterySaver = false;
  if (BATTERY_SUPPORTED) {
    try {
      batterySaver = await Battery.isLowPowerModeEnabledAsync();
    } catch {
      batterySaver = false;
    }
  }

  return buildMotionState(reduced, batterySaver);
}

// Stay static until the async accessibility preference is known. This avoids
// briefly starting motion for users who have Reduce Motion enabled.
const DEFAULT_MOTION: PremiumMotionState = buildMotionState(true, false, false);

/** Gates animations — core logo/screen motion runs on all devices unless reduce-motion is on. */
export function usePremiumMotion(): PremiumMotionState {
  const [state, setState] = useState<PremiumMotionState>(cachedState ?? DEFAULT_MOTION);
  const batterySaverRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    void resolveMotionState().then((next) => {
      cachedState = next;
      batterySaverRef.current = !next.enabled && !next.reduced;
      if (mounted) setState(next);
    });

    const reduceSub = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduced) => {
      setState((prev) => {
        const next = buildMotionState(reduced, batterySaverRef.current);
        cachedState = next;
        return next;
      });
    });

    const batterySub = BATTERY_SUPPORTED
      ? Battery.addLowPowerModeListener(({ lowPowerMode }) => {
          batterySaverRef.current = lowPowerMode;
          setState((prev) => {
            const next = buildMotionState(prev.reduced, lowPowerMode);
            cachedState = next;
            return next;
          });
        })
      : null;

    return () => {
      mounted = false;
      reduceSub.remove();
      batterySub?.remove();
    };
  }, []);

  return state;
}

export function getPremiumMotionEnabled(): boolean {
  return cachedState?.enabled ?? true;
}

export function getCoreMotionEnabled(): boolean {
  return cachedState?.coreMotion ?? true;
}
