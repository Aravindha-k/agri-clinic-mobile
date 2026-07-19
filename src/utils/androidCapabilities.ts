import { Platform } from "react-native";
import Constants from "expo-constants";

/** Android API level when available; null on iOS / unknown. */
export function getAndroidApiLevel(): number | null {
  if (Platform.OS !== "android") return null;
  const v = Platform.Version;
  return typeof v === "number" ? v : Number.parseInt(String(v), 10) || null;
}

export function androidAtLeast(api: number): boolean {
  const level = getAndroidApiLevel();
  return level != null && level >= api;
}

/**
 * Capability matrix for optional native features.
 * Unsupported capabilities must degrade — never block startup.
 */
export function getAndroidCapabilities() {
  const api = getAndroidApiLevel();
  const isExpoGo = Constants.appOwnership === "expo";

  return {
    apiLevel: api,
    /** POST_NOTIFICATIONS runtime permission (API 33+). */
    requiresNotificationPermission: androidAtLeast(33),
    /** READ_MEDIA_IMAGES instead of broad storage (API 33+). */
    usesPhotoPickerMediaPermission: androidAtLeast(33),
    /** Background location is a separate permission step (API 29+). */
    requiresBackgroundLocationSeparate: androidAtLeast(29),
    /** Foreground service type location (API 34+ enforcement). */
    requiresFgsLocationType: androidAtLeast(34),
    /** Exact alarms restricted (API 31+). */
    exactAlarmsRestricted: androidAtLeast(31),
    /** Edge-to-edge / gesture nav common (API 29+). */
    modernSystemGestures: androidAtLeast(29),
    /** Expo Go cannot run full background location / remote push. */
    expoGoLimitedNative: isExpoGo,
    backgroundLocationSupported: !isExpoGo,
    remotePushSupported: !isExpoGo
  };
}

export type AndroidCapabilities = ReturnType<typeof getAndroidCapabilities>;
