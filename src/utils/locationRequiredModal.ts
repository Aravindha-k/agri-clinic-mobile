import { Alert } from "react-native";
import { ensureAndroidLocationServicesEnabled } from "./ensureAndroidLocationServices";
import { hasValidMapCoords } from "./mapCoords";
import { probeGpsAvailability } from "./gpsStatus";
import {
  ensureLocationReadyForVisit,
  ensureLocationReadyForWorkday,
  openFieldTrackingFix,
  promptFixLocationAccess
} from "../features/fieldTrackingSetup";

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

/**
 * Silent readiness gate for Start Workday / visit entry.
 * Never shows the Android permission dialog — Fix Now opens Field Tracking Setup.
 */
export async function requestGpsForFieldWork(
  options?: FieldGpsRequestOptions
): Promise<boolean> {
  if (fieldWorkGateInFlight) {
    return false;
  }
  fieldWorkGateInFlight = true;
  try {
    if (hasTrustedActiveFix(options)) {
      return true;
    }

    const availability = await probeGpsAvailability();
    if (availability === "services_off") {
      const resolved = await ensureAndroidLocationServicesEnabled();
      if (resolved.status === "enabled" || resolved.status === "enabled_by_user") {
        // fall through to permission readiness
      } else {
        showInlineAlert("Turn on device location to start your workday.");
        return false;
      }
    }

    const ready = await ensureLocationReadyForWorkday();
    if (ready.ok) return true;
    promptFixLocationAccess(ready, { title: TITLE });
    return false;
  } finally {
    fieldWorkGateInFlight = false;
  }
}

/**
 * Visit FAB / New Visit gate — silent check only.
 * Never auto-opens Android Settings or permission dialogs.
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

    if (hasTrustedActiveFix(options)) {
      return true;
    }

    const availability = await probeGpsAvailability();
    if (availability === "services_off") {
      const resolved = await ensureAndroidLocationServicesEnabled();
      if (resolved.status !== "enabled" && resolved.status !== "enabled_by_user") {
        showInlineAlert("Turn on device location to capture the visit location.");
        return false;
      }
    }

    const ready = await ensureLocationReadyForVisit();
    if (ready.ok) return true;

    promptFixLocationAccess(ready, { title: TITLE });
    return false;
  } finally {
    visitGateInFlight = false;
  }
}

/** @deprecated Use requestVisitLocationAccess or requestGpsForFieldWork. */
export function showLocationRequiredModal(onEnable?: () => void) {
  void onEnable;
  openFieldTrackingFix(["foreground"]);
}
