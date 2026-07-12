import Constants from "expo-constants";
import { isExpoGo } from "./mapLibreNative";

export { isExpoGo, isNativeMapRuntime, EXPO_GO_MAP_HINT } from "./mapLibreNative";

/** Expo Go dev warnings are for engineers only — hide from field employees in production. */
export function shouldShowExpoGoDevWarning(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__ && isExpoGo();
}

/** Expo dashboard builds page for this project, or Expo build docs as fallback. */
export function getExpoBuildUrl(): string {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId === "string" && projectId.length > 0) {
    return `https://expo.dev/projects/${projectId}/builds`;
  }
  return "https://docs.expo.dev/build/setup/";
}
