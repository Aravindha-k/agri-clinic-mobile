import { Alert, Linking } from "react-native";
import { ensureTrackingPermissions } from "./location";
import { isGpsAvailable, probeGpsAvailability } from "./gpsStatus";

const TITLE = "Location Required";
const MESSAGE =
  "Enable location to start your workday and capture field visits.";
const ENABLE = "Enable Location";
const NOT_NOW = "Not Now";

export function showLocationRequiredModal(onEnable?: () => void) {
  Alert.alert(TITLE, MESSAGE, [
    { text: NOT_NOW, style: "cancel" },
    {
      text: ENABLE,
      onPress: () => {
        if (onEnable) {
          onEnable();
          return;
        }
        void Linking.openSettings().catch(() => undefined);
      }
    }
  ]);
}

/** Prompts for permission when needed; shows the location modal when GPS is unavailable. */
export async function requestGpsForFieldWork(): Promise<boolean> {
  const availability = await probeGpsAvailability();
  if (isGpsAvailable(availability)) {
    return true;
  }

  const permissions = await ensureTrackingPermissions();
  if (permissions.foreground) {
    return true;
  }

  showLocationRequiredModal();
  return false;
}
