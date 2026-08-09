import { Alert } from "react-native";
import { navigateRoot } from "../../navigation/rootNavigationRef";
import { shouldOfferFieldTrackingSetup } from "./probe";
import type { SetupStepId } from "./types";

let offeredThisSession = false;

/**
 * After password login — open existing FieldTrackingSetup only when OS permission
 * is actually incomplete. Never navigates when already granted.
 */
export async function maybeOfferFieldTrackingSetupAfterLogin(): Promise<void> {
  if (offeredThisSession) return;
  const offer = await shouldOfferFieldTrackingSetup();
  if (!offer) return;
  offeredThisSession = true;

  // Wait briefly so RootNavigator can mount Main after auth phase flips.
  setTimeout(() => {
    const opened = navigateRoot("FieldTrackingSetup", undefined);
    if (!opened) {
      setTimeout(() => navigateRoot("FieldTrackingSetup", undefined), 600);
    }
  }, 400);
}

export function resetFieldTrackingSetupOfferSession(): void {
  offeredThisSession = false;
}

/**
 * Start Workday health check (silent probe only).
 * Interactive Start Work Day uses startWorkDayWithLocationGate instead.
 */
export async function ensureFieldTrackingReadyForWorkday(): Promise<{
  ok: boolean;
  missing: SetupStepId[];
}> {
  const { ensureLocationReadyForAction } = await import("./locationReadinessGate");
  const result = await ensureLocationReadyForAction({ probeOnly: true });
  if (result.status === "ready") {
    return { ok: true, missing: [] };
  }
  return { ok: false, missing: ["foreground"] };
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
