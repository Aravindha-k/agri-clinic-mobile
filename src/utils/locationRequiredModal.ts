import { Alert } from "react-native";
import { ensureAndroidLocationServicesEnabled } from "./ensureAndroidLocationServices";
import { ensureForegroundPermission } from "./location";
import { hasValidMapCoords } from "./mapCoords";
import { isGpsAvailable, probeGpsAvailability } from "./gpsStatus";

const TITLE = "Location Required";
const MESSAGE =
  "Enable location to start your workday and capture field visits.";
const ENABLE = "Enable Location";
const NOT_NOW = "Not Now";

export type FieldGpsRequestOptions = {
  /** When workday is active and tracking already has a fix, skip re-probing. */
  trustActiveWorkdayFix?: boolean;
  activeFix?: { latitude: number; longitude: number } | null;
};

export function showLocationRequiredModal(onEnable?: () => void) {
  Alert.alert(TITLE, MESSAGE, [
    { text: NOT_NOW, style: "cancel" },
    {
      text: ENABLE,
      onPress: () => {
        if (onEnable) {
          void onEnable();
          return;
        }
        // Re-request in-app permission — never auto-open Android Settings.
        void ensureForegroundPermission().catch(() => undefined);
      }
    }
  ]);
}

const GPS_OFF_MESSAGE =
  "Turn on device location (GPS) in your phone settings to continue field work.";

function hasTrustedActiveFix(options?: FieldGpsRequestOptions): boolean {
  if (!options?.trustActiveWorkdayFix || !options.activeFix) {
    return false;
  }
  const { latitude, longitude } = options.activeFix;
  return hasValidMapCoords(latitude, longitude);
}

/** Foreground GPS only — never re-prompts for background permission on visits. */
export async function requestGpsForFieldWork(
  options?: FieldGpsRequestOptions
): Promise<boolean> {
  try {
    if (hasTrustedActiveFix(options)) {
      return true;
    }

    let availability = await probeGpsAvailability();
    if (isGpsAvailable(availability)) {
      return true;
    }

    if (availability === "services_off") {
      const resolved = await ensureAndroidLocationServicesEnabled();
      if (resolved.status === "enabled" || resolved.status === "enabled_by_user") {
        return true;
      }
      availability = await probeGpsAvailability();
      if (isGpsAvailable(availability)) {
        return true;
      }
      Alert.alert(TITLE, GPS_OFF_MESSAGE);
      return false;
    }

    if (availability === "permission_undetermined" || availability === "permission_denied") {
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
  } catch {
    return false;
  }
}
