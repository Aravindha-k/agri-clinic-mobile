import * as Battery from "expo-battery";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { withTimeout } from "../utils/withTimeout";
import { logMotionDiagnosticsOnce } from "../utils/motionDiagnostics";
import { STARTUP_TIMEOUTS } from "../bootstrap/startupCoordinator";

export type MotionPreference = "full" | "reduced" | "unknown";

export type PremiumMotionState = {
  /** Resolved accessibility preference — unknown until OS reports. */
  preference: MotionPreference;
  /** Accessibility preference has been resolved at least once. */
  ready: boolean;
  /**
   * Heavy decorative effects only (particles, Lottie, glass sheen, splash golden dust).
   * May be off during battery saver — core logo/screen motion still runs.
   */
  enabled: boolean;
  /** User or system explicitly prefers reduced motion. */
  reduced: boolean;
  /** Core UI motion (screen entrances, logo zoom, splash orbit). */
  coreMotion: boolean;
  /** Attempt full motion unless the OS explicitly reports reduced motion. */
  wantsFullMotion: boolean;
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
  const preference: MotionPreference = !ready ? "unknown" : reduced ? "reduced" : "full";
  const heavyEffects = ready ? !reduced && !batterySaver : !batterySaver;
  return {
    preference,
    ready,
    reduced: ready ? reduced : false,
    enabled: heavyEffects,
    coreMotion: ready ? !reduced : true,
    wantsFullMotion: ready ? !reduced : true
  };
}

async function resolveMotionState(): Promise<PremiumMotionState> {
  let reduced = false;
  try {
    reduced = await withTimeout(
      AccessibilityInfo.isReduceMotionEnabled(),
      STARTUP_TIMEOUTS.motionPreferenceMs,
      false,
      "reduce_motion"
    );
  } catch {
    reduced = false;
  }

  let batterySaver = false;
  if (BATTERY_SUPPORTED) {
    try {
      batterySaver = await withTimeout(
        Battery.isLowPowerModeEnabledAsync(),
        STARTUP_TIMEOUTS.motionPreferenceMs,
        false,
        "battery_saver"
      );
    } catch {
      batterySaver = false;
    }
  }

  return buildMotionState(reduced, batterySaver, true);
}

/** Unknown → attempt full motion with safe watchdogs; explicit reduced → static fallback. */
const DEFAULT_MOTION: PremiumMotionState = buildMotionState(false, false, false);

/** True only when the OS has explicitly enabled reduce motion. */
export function isExplicitReducedMotion(state: PremiumMotionState): boolean {
  return state.ready && state.reduced;
}

/** Core motion runs unless reduce motion is explicitly enabled. */
export function shouldRunCoreMotion(state: PremiumMotionState): boolean {
  return state.ready ? !state.reduced : true;
}

/** Gates animations — core logo/screen motion runs unless reduce-motion is explicitly on. */
export function usePremiumMotion(): PremiumMotionState {
  const [state, setState] = useState<PremiumMotionState>(cachedState ?? DEFAULT_MOTION);
  const batterySaverRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    void resolveMotionState().then((next) => {
      cachedState = next;
      batterySaverRef.current = !next.enabled && !next.reduced;
      if (mounted) setState(next);
      void logMotionDiagnosticsOnce({
        motionPreference: next.preference,
        motionReady: next.ready
      });
    });

    const reduceSub = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduced) => {
      setState((prev) => {
        const next = buildMotionState(reduced, batterySaverRef.current, true);
        cachedState = next;
        return next;
      });
    });

    const batterySub = BATTERY_SUPPORTED
      ? Battery.addLowPowerModeListener(({ lowPowerMode }) => {
          batterySaverRef.current = lowPowerMode;
          setState((prev) => {
            const next = buildMotionState(prev.ready ? prev.reduced : false, lowPowerMode, prev.ready);
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
  if (!cachedState) return true;
  return cachedState.coreMotion;
}
