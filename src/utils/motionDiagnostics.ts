import { useEffect } from "react";
import { AccessibilityInfo, AppState, Platform } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { MotionPreference } from "../hooks/usePremiumMotion";

let loggedOnce = false;

type MotionDiagnosticPayload = {
  platform: string;
  manufacturer: string;
  model: string;
  osVersion: string;
  appState: string;
  reduceMotionEnabled: boolean | null;
  reanimatedReducedMotion: boolean | null;
  motionPreference: MotionPreference;
  motionReady: boolean;
};

/** Dev-only hook — logs device + motion probes once per launch. */
export function useMotionDiagnosticsProbe(motionPreference: MotionPreference, motionReady: boolean): void {
  const reanimatedReduced = useReducedMotion();

  useEffect(() => {
    if (!__DEV__ || loggedOnce) return;
    loggedOnce = true;

    void (async () => {
      let reduceMotionEnabled: boolean | null = null;
      try {
        reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        reduceMotionEnabled = null;
      }

      const constants = Platform.constants as Record<string, unknown> | undefined;
      const payload: MotionDiagnosticPayload = {
        platform: Platform.OS,
        manufacturer: String(constants?.Brand ?? constants?.Manufacturer ?? "unknown"),
        model: String(constants?.Model ?? "unknown"),
        osVersion: String(Platform.Version),
        appState: AppState.currentState,
        reduceMotionEnabled,
        reanimatedReducedMotion: reanimatedReduced,
        motionPreference,
        motionReady
      };

      console.log("[MotionDiagnostics]", JSON.stringify(payload));
    })();
  }, [motionPreference, motionReady, reanimatedReduced]);
}

/** @deprecated Prefer useMotionDiagnosticsProbe inside a mounted component. */
export async function logMotionDiagnosticsOnce(input: {
  motionPreference: MotionPreference;
  motionReady: boolean;
}): Promise<void> {
  if (!__DEV__ || loggedOnce) return;
  loggedOnce = true;

  let reduceMotionEnabled: boolean | null = null;
  try {
    reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    reduceMotionEnabled = null;
  }

  const constants = Platform.constants as Record<string, unknown> | undefined;
  const payload: MotionDiagnosticPayload = {
    platform: Platform.OS,
    manufacturer: String(constants?.Brand ?? constants?.Manufacturer ?? "unknown"),
    model: String(constants?.Model ?? "unknown"),
    osVersion: String(Platform.Version),
    appState: AppState.currentState,
    reduceMotionEnabled,
    reanimatedReducedMotion: null,
    motionPreference: input.motionPreference,
    motionReady: input.motionReady
  };

  console.log("[MotionDiagnostics]", JSON.stringify(payload));
}
