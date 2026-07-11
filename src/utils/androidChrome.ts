import { Platform } from "react-native";
import { Colors } from "../../mobile/lib/theme";

/** Match tab/shell background — prevents black strips under edge-to-edge nav bar on Android. */
export const ANDROID_CHROME_BG = Colors.bg;

export async function applyAndroidChromeColors() {
  if (Platform.OS !== "android") return;
  try {
    const NavigationBar = await import("expo-navigation-bar");
    await NavigationBar.setBackgroundColorAsync(ANDROID_CHROME_BG);
    await NavigationBar.setButtonStyleAsync("dark");
  } catch {
    /* native module unavailable in some runtimes */
  }
}
