import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * True when running inside the Expo Go client (no custom native modules).
 * Uses multiple signals — a single check can be wrong on some SDK builds.
 */
export function isExpoGo(): boolean {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return true;
  }
  if (Constants.appOwnership === "expo") {
    return true;
  }
  if (Constants.expoGoConfig != null) {
    return true;
  }
  return false;
}

/** Native MapLibre builds: dev client, release APK, standalone — never Expo Go. */
export function isNativeMapRuntime(): boolean {
  return !isExpoGo();
}

export const EXPO_GO_MAP_HINT =
  "Route preview · live map available in app build";
