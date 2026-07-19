import { Alert } from "react-native";
import { navigateRoot } from "../../navigation/rootNavigationRef";
import { shouldOfferFieldTrackingSetup } from "./probe";
import type { SetupStepId } from "./types";

let offeredThisSession = false;

/** After password login — open setup once when permissions incomplete. */
export async function maybeOfferFieldTrackingSetupAfterLogin(): Promise<void> {
  if (offeredThisSession) return;
  const offer = await shouldOfferFieldTrackingSetup();
  if (!offer) return;
  offeredThisSession = true;

  // Wait briefly so RootNavigator can mount Main after auth phase flips.
  setTimeout(() => {
    const opened = navigateRoot("FieldTrackingSetup", undefined);
    if (!opened) {
      // Retry once if nav was not ready.
      setTimeout(() => navigateRoot("FieldTrackingSetup", undefined), 600);
    }
  }, 400);
}

export function resetFieldTrackingSetupOfferSession(): void {
  offeredThisSession = false;
}

/**
 * Start Workday health check.
 * Returns true when tracking-critical permissions are ready.
 * Never requests OS permission dialogs.
 */
export async function ensureFieldTrackingReadyForWorkday(): Promise<{
  ok: boolean;
  missing: SetupStepId[];
}> {
  const { ensureLocationReadyForWorkday } = await import("./locationPermissionService");
  const result = await ensureLocationReadyForWorkday();
  if (result.ok) {
    return { ok: true, missing: [] };
  }
  return { ok: false, missing: result.missing };
}

export function showFieldTrackingNeedsAttentionAlert(
  missing: SetupStepId[],
  onFix: () => void
): void {
  const labels: Record<SetupStepId, string> = {
    foreground: "Location access",
    background: "Allow all the time location",
    precise: "Precise location",
    battery: "Background battery access",
    oem: "Phone battery settings",
    notifications: "Tracking notification"
  };
  const list = missing.map((id) => `• ${labels[id] ?? id}`).join("\n");
  Alert.alert(
    "Tracking setup needs attention",
    list || "Field tracking permissions need a quick check.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Fix Now", onPress: onFix }
    ]
  );
}
