import * as Location from "expo-location";
import { hasValidMapCoords } from "./mapCoords";

/** Accept last-known fixes up to 15 minutes old when the OS misreports services. */
const LAST_KNOWN_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * Whether device location services appear usable for field work.
 * Some Android builds report `hasServicesEnabledAsync() === false` while GPS still works.
 */
export async function readLocationServicesEnabled(): Promise<boolean> {
  try {
    if (await Location.hasServicesEnabledAsync()) {
      return true;
    }
  } catch {
    /* fall through to permission + last-known probe */
  }

  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return false;
    }

    const last = await Location.getLastKnownPositionAsync();
    if (!last) {
      return false;
    }

    if (Date.now() - last.timestamp > LAST_KNOWN_MAX_AGE_MS) {
      return false;
    }

    const { latitude, longitude } = last.coords;
    return hasValidMapCoords(latitude, longitude);
  } catch {
    return false;
  }
}
