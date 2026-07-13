import { Alert } from "react-native";
import { ensureAndroidLocationServicesEnabled } from "./ensureAndroidLocationServices";
import { ensureForegroundPermission } from "./location";
import { hasValidMapCoords } from "./mapCoords";
import { isGpsAvailable, probeGpsAvailability } from "./gpsStatus";

const TITLE = "Location Required";

export type FieldGpsRequestOptions = {
  /** When workday is active and tracking already has a fix, skip re-probing. */
  trustActiveWorkdayFix?: boolean;
  activeFix?: { latitude: number; longitude: number } | null;
};

export type VisitLocationGateOptions = FieldGpsRequestOptions & {
  workdayActive: boolean;
};

const WORKDAY_INACTIVE_MESSAGE = "Start your workday before recording a visit.";
const VISIT_PERMISSION_MESSAGE = "Allow location access to capture the visit location.";
const VISIT_GPS_OFF_MESSAGE = "Turn on device location to capture the visit location.";
const WORKDAY_PERMISSION_MESSAGE = "Allow location access to start your workday.";
const WORKDAY_GPS_OFF_MESSAGE = "Turn on device location to start your workday.";

let visitGateInFlight = false;
let fieldWorkGateInFlight = false;

function hasTrustedActiveFix(options?: FieldGpsRequestOptions): boolean {
  if (!options?.trustActiveWorkdayFix || !options.activeFix) {
    return false;
  }
  const { latitude, longitude } = options.activeFix;
  return hasValidMapCoords(latitude, longitude);
}

function showInlineAlert(message: string) {
  Alert.alert(TITLE, message, [{ text: "OK", style: "default" }]);
}

/** Foreground GPS for starting workday — workday-specific copy. */
export async function requestGpsForFieldWork(
  options?: FieldGpsRequestOptions
): Promise<boolean> {
  if (fieldWorkGateInFlight) {
    return false;
  }
  fieldWorkGateInFlight = true;
  try {
    return await resolveFieldLocationAccess({
      permissionMessage: WORKDAY_PERMISSION_MESSAGE,
      gpsOffMessage: WORKDAY_GPS_OFF_MESSAGE,
      options
    });
  } finally {
    fieldWorkGateInFlight = false;
  }
}

/**
 * Visit FAB location gate — workday must already be active; context-specific messages.
 * Never auto-opens Android Settings.
 */
export async function requestVisitLocationAccess(
  options: VisitLocationGateOptions
): Promise<boolean> {
  if (visitGateInFlight) {
    return false;
  }
  visitGateInFlight = true;
  try {
    if (!options.workdayActive) {
      showInlineAlert(WORKDAY_INACTIVE_MESSAGE);
      return false;
    }

    return await resolveFieldLocationAccess({
      permissionMessage: VISIT_PERMISSION_MESSAGE,
      gpsOffMessage: VISIT_GPS_OFF_MESSAGE,
      options
    });
  } finally {
    visitGateInFlight = false;
  }
}

async function resolveFieldLocationAccess({
  permissionMessage,
  gpsOffMessage,
  options
}: {
  permissionMessage: string;
  gpsOffMessage: string;
  options?: FieldGpsRequestOptions;
}): Promise<boolean> {
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
      showInlineAlert(gpsOffMessage);
      return false;
    }

    if (availability === "permission_undetermined" || availability === "permission_denied") {
      const permission = await ensureForegroundPermission();
      if (permission.granted) {
        return true;
      }
      if (permission.message?.includes("GPS is turned off")) {
        showInlineAlert(gpsOffMessage);
        return false;
      }
      showInlineAlert(permissionMessage);
      return false;
    }

    const permission = await ensureForegroundPermission();
    if (permission.granted) {
      return true;
    }

    if (permission.message?.includes("GPS is turned off")) {
      showInlineAlert(gpsOffMessage);
      return false;
    }

    showInlineAlert(permissionMessage);
    return false;
  } catch {
    return false;
  }
}

/** @deprecated Use requestVisitLocationAccess or requestGpsForFieldWork. */
export function showLocationRequiredModal(onEnable?: () => void) {
  void onEnable;
  showInlineAlert(WORKDAY_PERMISSION_MESSAGE);
}
