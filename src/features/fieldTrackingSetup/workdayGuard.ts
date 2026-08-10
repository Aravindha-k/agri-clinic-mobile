/**
 * Post-login location readiness — native OS dialog only.
 * Never navigates to a custom Enable Location instruction screen.
 */
import { Alert } from "react-native";
import { enableLocationForFieldWork } from "./ensureForegroundLocation";
import type { SetupStepId } from "./types";

let offeredThisSession = false;

/**
 * After password login — if foreground location is missing and requestable,
 * show the Android native permission dialog immediately. No custom setup UI.
 */
export async function maybeOfferFieldTrackingSetupAfterLogin(): Promise<void> {
  if (offeredThisSession) return;
  offeredThisSession = true;
  try {
    await enableLocationForFieldWork();
  } catch {
    // Never block login → Today on permission errors.
  }
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
  _missing: SetupStepId[],
  onFix: () => void
): void {
  Alert.alert(
    "Location needed",
    "Allow location when asked so Kavya Agri Clinic can record field work.",
    [
      { text: "Not now", style: "cancel" },
      {
        text: "Allow Location",
        onPress: () => {
          void (async () => {
            await enableLocationForFieldWork().catch(() => undefined);
            onFix();
          })();
        }
      }
    ]
  );
}
