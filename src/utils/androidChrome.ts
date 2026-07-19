import { Platform } from "react-native";
import { Colors } from "../../mobile/lib/theme";
import { getAndroidCapabilities } from "./androidCapabilities";

/** Match tab/shell background — prevents black strips under edge-to-edge nav bar on Android. */
export const ANDROID_CHROME_BG = Colors.bg;

/**
 * Apply navigation-bar chrome when the API is supported.
 * Edge-to-edge / Expo Go may reject setBackgroundColorAsync — never throw.
 */
export async function applyAndroidChromeColors() {
  if (Platform.OS !== "android") return;
  const caps = getAndroidCapabilities();
  if (caps.expoGoLimitedNative) {
    // Expo Go often logs unsupported edge-to-edge warnings — skip quietly.
    return;
  }
  try {
    const NavigationBar = await import("expo-navigation-bar");
    if (typeof NavigationBar.setBackgroundColorAsync === "function") {
      await NavigationBar.setBackgroundColorAsync(ANDROID_CHROME_BG);
    }
    if (typeof NavigationBar.setButtonStyleAsync === "function") {
      await NavigationBar.setButtonStyleAsync("dark");
    }
  } catch {
    /* native module unavailable or rejected under edge-to-edge */
  }
}
