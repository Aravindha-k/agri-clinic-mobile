import { Alert, Linking } from "react-native";
import { ensureForegroundPermission } from "./location";
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

const GPS_OFF_MESSAGE =
  "Turn on device location (GPS) in your phone settings to continue field work.";

/** Foreground GPS only — never re-prompts for background permission on visits. */
export async function requestGpsForFieldWork(): Promise<boolean> {
  const availability = await probeGpsAvailability();
  if (isGpsAvailable(availability)) {
    return true;
  }

  if (availability === "services_off") {
    Alert.alert(TITLE, GPS_OFF_MESSAGE);
    return false;
  }

  const permission = await ensureForegroundPermission();
  if (permission.granted) {
    return true;
  }

  if (permission.message?.includes("GPS is turned off")) {
    Alert.alert(TITLE, GPS_OFF_MESSAGE);
    return false;
  }

  showLocationRequiredModal();
  return false;
}
