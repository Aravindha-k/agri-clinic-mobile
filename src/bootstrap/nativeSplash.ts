import * as SplashScreen from "expo-splash-screen";
import { logStartup, logStartupError } from "../utils/startupDiagnostics";

let holdRequested = false;
let hideRequested = false;

/** Keep the OS splash visible until the React boot fallback is painted. */
export async function holdNativeSplash(): Promise<void> {
  if (holdRequested) {
    return;
  }
  holdRequested = true;
  try {
    await SplashScreen.preventAutoHideAsync();
  } catch (err) {
    logStartupError(
      err instanceof Error ? err.message : "preventAutoHideAsync failed"
    );
  }
}

/** Hide native splash — safe to call multiple times. */
export async function hideNativeSplashSafe(reason?: string): Promise<void> {
  if (hideRequested) {
    return;
  }
  hideRequested = true;
  logStartup("native_splash_hide_attempt", reason);
  try {
    await SplashScreen.hideAsync();
  } catch (err) {
    logStartupError(err instanceof Error ? err.message : "hideAsync failed");
  }
}
