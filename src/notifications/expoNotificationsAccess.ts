import { Platform } from "react-native";
import { isExpoGo } from "../utils/expoRuntime";

export type ExpoNotificationsModule = typeof import("expo-notifications");

let expoGoWarned = false;
let modulePromise: Promise<ExpoNotificationsModule> | null = null;

/** One dev-only line — avoids RedBox from expo-notifications module init in Expo Go. */
export function warnExpoGoNotificationsOnce(): void {
  if (!isExpoGo() || expoGoWarned || Platform.OS === "web") {
    return;
  }
  expoGoWarned = true;
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(
      "[Notifications] Skipping expo-notifications in Expo Go (SDK 53+ remote push unsupported). Development builds and release APK retain full notification support."
    );
  }
}

/** Loads expo-notifications only outside Expo Go — never triggers SDK 53 RedBox at bundle eval. */
export async function loadExpoNotifications(): Promise<ExpoNotificationsModule | null> {
  if (Platform.OS === "web") {
    return null;
  }
  if (isExpoGo()) {
    warnExpoGoNotificationsOnce();
    return null;
  }
  modulePromise ??= import("expo-notifications");
  return modulePromise;
}

export function isExpoGoNotificationsSupported(): boolean {
  return Platform.OS !== "web" && !isExpoGo();
}
