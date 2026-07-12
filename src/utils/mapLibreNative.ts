import Constants from "expo-constants";
import { TurboModuleRegistry } from "react-native";

/** True when running inside the Expo Go client (no custom native modules). */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

/** MapLibre native TurboModules are only present in dev/release builds after prebuild. */
export function isMapLibreNativeAvailable(): boolean {
  if (isExpoGo()) return false;
  try {
    return TurboModuleRegistry.get("MLRNCameraModule") != null;
  } catch {
    return false;
  }
}

export const MAPLIBRE_DEV_BUILD_MESSAGE =
  "Map requires a development build. In Expo Go, maps are unavailable — run npx expo run:android after prebuild.";
