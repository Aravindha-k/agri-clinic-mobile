/**
 * Workday-scoped background location + notification permission.
 * Called only from Start Work Day gate — never at app launch.
 * Never opens Settings automatically.
 */
import { Alert, Platform } from "react-native";
import * as Location from "expo-location";
import { trackingDevLog } from "../../tracking/trackingDevLog";

export const WORKDAY_LOCATION_DISCLOSURE =
  "Location is used during your active workday so the office can view your latest field location.";

export type BackgroundLocationPermissionResult = {
  granted: boolean;
  status: string;
  didRequest: boolean;
  disclosed: boolean;
};

let backgroundInFlight: Promise<BackgroundLocationPermissionResult> | null = null;

function isGranted(response: Location.LocationPermissionResponse): boolean {
  return response.granted === true || response.status === "granted";
}

async function showWorkdayLocationDisclosure(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Field location tracking",
      WORKDAY_LOCATION_DISCLOSURE,
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Continue", onPress: () => resolve(true) }
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

async function ensureNotificationPermissionForTracking(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const Notifications = await import("expo-notifications");
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return;
    await Notifications.requestPermissionsAsync();
  } catch {
    // Optional — FGS may still show a system notification channel.
  }
}

/**
 * After foreground location is granted: disclose → request background ("all the time")
 * and notification permission so the persistent tracking notification can display.
 */
export async function ensureBackgroundLocationForWorkday(): Promise<BackgroundLocationPermissionResult> {
  if (backgroundInFlight) {
    return backgroundInFlight;
  }

  backgroundInFlight = (async (): Promise<BackgroundLocationPermissionResult> => {
    try {
      const current = await Location.getBackgroundPermissionsAsync();
      if (isGranted(current)) {
        await ensureNotificationPermissionForTracking();
        trackingDevLog("background_permission", "already_granted");
        return {
          granted: true,
          status: current.status,
          didRequest: false,
          disclosed: false
        };
      }

      const proceed = await showWorkdayLocationDisclosure();
      if (!proceed) {
        trackingDevLog("background_permission", "disclosure_declined");
        return {
          granted: false,
          status: current.status,
          didRequest: false,
          disclosed: true
        };
      }

      const requested = await Location.requestBackgroundPermissionsAsync();
      trackingDevLog(
        "background_permission",
        isGranted(requested) ? "granted" : requested.status
      );
      await ensureNotificationPermissionForTracking();
      return {
        granted: isGranted(requested),
        status: requested.status,
        didRequest: true,
        disclosed: true
      };
    } catch (err) {
      trackingDevLog(
        "background_permission",
        err instanceof Error ? err.message : "request_failed"
      );
      return {
        granted: false,
        status: "undetermined",
        didRequest: false,
        disclosed: true
      };
    }
  })();

  try {
    return await backgroundInFlight;
  } finally {
    backgroundInFlight = null;
  }
}
