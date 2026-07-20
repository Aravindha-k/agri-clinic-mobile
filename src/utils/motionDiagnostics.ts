import { AccessibilityInfo, AppState, Platform } from "react-native";
import type { MotionPreference } from "../hooks/usePremiumMotion";

let loggedOnce = false;

type MotionDiagnosticPayload = {
  platform: string;
  manufacturer: string;
  model: string;
  osVersion: string;
  appState: string;
  reduceMotionEnabled: boolean | null;
  motionPreference: MotionPreference;
  motionReady: boolean;
};

/** Log device motion context once per app launch — dev builds only, no PII. */
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
    motionPreference: input.motionPreference,
    motionReady: input.motionReady
  };

  console.log("[MotionDiagnostics]", JSON.stringify(payload));
}
