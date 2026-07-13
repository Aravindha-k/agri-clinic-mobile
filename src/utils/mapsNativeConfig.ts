import Constants from "expo-constants";
import { Platform } from "react-native";
import { isExpoGo } from "./expoRuntime";

/** Shown when the Android manifest was built without a Google Maps API key. */
export const MAP_CONFIG_UNAVAILABLE_MESSAGE =
  "Map configuration is unavailable in this build.";

/**
 * True when Expo config recorded a Google Maps Android API key at build time.
 * Does not expose the key to JavaScript — only whether native Maps was configured.
 */
export function isAndroidMapsNativeConfigured(): boolean {
  if (Platform.OS !== "android") return true;
  // Expo Go ships its own Google Maps native environment (see GOOGLE_MAPS_HISTORICAL_ROOT_CAUSE.md).
  if (isExpoGo()) return true;
  const configured = Constants.expoConfig?.extra?.mapsNativeConfigured;
  return configured !== false;
}
