import { Alert } from "react-native";
import { hasValidMapCoords } from "./mapCoords";
import {
  ensureLocationReadyForAction,
  openSettingsForPendingStartWorkDay,
  LOCATION_GATE_MESSAGES
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
 * Location readiness for Start Workday / field actions.
 * Uses the canonical gate (permission request + GPS prompt). Never auto-opens Settings.
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

    const readiness = await ensureLocationReadyForAction();
    if (readiness.status === "ready") {
      return true;
    }

    if (readiness.status === "permission_denied_permanent") {
      Alert.alert(TITLE, readiness.message || LOCATION_GATE_MESSAGES.permissionPermanent, [
        { text: "Not now", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            void openSettingsForPendingStartWorkDay(async () => {
              // Permission restored — caller may tap Start again or resume via pending Home flow.
            });
          }
        }
      ]);
      return false;
    }

    showInlineAlert(readiness.message || LOCATION_GATE_MESSAGES.error);
    return false;
  } finally {
    fieldWorkGateInFlight = false;
  }
}

/**
 * Visit FAB / New Visit gate — canonical location readiness.
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

    if (hasTrustedActiveFix(options)) {
      return true;
    }

    const readiness = await ensureLocationReadyForAction();
    if (readiness.status === "ready") {
      return true;
    }

    if (readiness.status === "permission_denied_permanent") {
      Alert.alert(TITLE, readiness.message || LOCATION_GATE_MESSAGES.permissionPermanent, [
        { text: "Not now", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            void openSettingsForPendingStartWorkDay(async () => undefined);
          }
        }
      ]);
      return false;
    }

    showInlineAlert(readiness.message || LOCATION_GATE_MESSAGES.error);
    return false;
  } finally {
    visitGateInFlight = false;
  }
}

/** @deprecated Use requestVisitLocationAccess or requestGpsForFieldWork. */
export function showLocationRequiredModal(onEnable?: () => void) {
  void onEnable;
  void import("../features/fieldTrackingSetup").then(({ openFieldTrackingFix }) => {
    openFieldTrackingFix(["foreground"]);
  });
}
