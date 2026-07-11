import * as SplashScreen from "expo-splash-screen";
import { logStartup, logStartupError } from "../utils/startupDiagnostics";

let holdRequested = false;
let hideRequested = false;

/**
 * Keep the OS splash visible until the React cinematic splash has painted.
 * Safe to call multiple times — only the first call runs preventAutoHideAsync.
 */
export async function holdNativeSplash(): Promise<void> {
  if (holdRequested) {
    return;
  }
  holdRequested = true;
  try {
    await SplashScreen.preventAutoHideAsync();
    logStartup("native_splash_hold");
  } catch (err) {
    logStartupError(err instanceof Error ? err.message : "preventAutoHideAsync failed");
  }
}

/**
 * Hide native splash once — idempotent.
 * Prefer calling from the cinematic splash first layout only.
 */
export async function hideNativeSplashSafe(reason?: string): Promise<void> {
  if (hideRequested) {
    return;
  }
  hideRequested = true;
  logStartup("native_splash_hide_attempt", reason);
  try {
    await SplashScreen.hideAsync();
    logStartup("native_splash_hidden", reason);
  } catch (err) {
    logStartupError(err instanceof Error ? err.message : "hideAsync failed");
  }
}

/** Whether hideAsync has already been requested (for diagnostics). */
export function isNativeSplashHideRequested(): boolean {
  return hideRequested;
}

// Hold as early as this module is imported (App entry).
void holdNativeSplash();
