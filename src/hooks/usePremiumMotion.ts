import * as Battery from "expo-battery";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export type PremiumMotionState = {
  /** Heavy cinematic effects (aurora drift, particles, glow pulses). */
  enabled: boolean;
  /** User or system prefers reduced motion. */
  reduced: boolean;
};

let cachedState: PremiumMotionState | null = null;

const BATTERY_SUPPORTED =
  Platform.OS !== "web" &&
  typeof Battery.isLowPowerModeEnabledAsync === "function" &&
  typeof Battery.addLowPowerModeListener === "function";

function isLowEndDevice(): boolean {
  if (Platform.OS === "android") {
    const version = typeof Platform.Version === "number" ? Platform.Version : parseInt(String(Platform.Version), 10);
    if (!Number.isNaN(version) && version < 26) return true;
  }
  return false;
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

  const lowEnd = isLowEndDevice();
  const enabled = !reduced && !batterySaver && !lowEnd;

  return { enabled, reduced };
}

/** Gates premium animations — never blocks GPS, sync, or form logic. */
export function usePremiumMotion(): PremiumMotionState {
  const [state, setState] = useState<PremiumMotionState>(
    cachedState ?? { enabled: Platform.OS !== "web", reduced: false }
  );

  useEffect(() => {
    let mounted = true;

    void resolveMotionState().then((next) => {
      cachedState = next;
      if (mounted) setState(next);
    });

    const reduceSub = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduced) => {
      setState((prev) => {
        const next = { ...prev, reduced, enabled: !reduced && prev.enabled };
        cachedState = next;
        return next;
      });
    });

    const batterySub = BATTERY_SUPPORTED
      ? Battery.addLowPowerModeListener(({ lowPowerMode }) => {
          setState((prev) => {
            const next = {
              ...prev,
              enabled: !prev.reduced && !lowPowerMode && !isLowEndDevice()
            };
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
  return cachedState?.enabled ?? Platform.OS !== "web";
}
