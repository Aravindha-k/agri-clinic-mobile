/**
 * Post-login location: silent OS probe, then one native foreground request if needed.
 * Never navigates to a custom Enable Location instruction screen.
 * Never opens App Settings. Never prompts GPS services at login.
 * Already-granted OS permission (including approximate) is reused with zero request.
 */
import * as Location from "expo-location";
import { Alert } from "react-native";
import { ensureForegroundLocationPermission } from "./ensureForegroundLocation";

let offeredThisSession = false;

async function healSetupIfOsGranted(): Promise<void> {
  try {
    const { markFieldTrackingSetupCompleted } = await import("./persistence");
    await markFieldTrackingSetupCompleted().catch(() => undefined);
  } catch {
    // Stale setup flags must never block login.
  }
}

function isForegroundGranted(response: Location.LocationPermissionResponse): boolean {
  return response.granted === true || response.status === Location.PermissionStatus.GRANTED;
}

/**
 * Password login only. Biometric reopen must not call this.
 * Probe silently; request native FG only when missing and canAskAgain.
 */
export async function maybeOfferFieldTrackingSetupAfterLogin(): Promise<void> {
  if (offeredThisSession) {
    return;
  }
  offeredThisSession = true;
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (isForegroundGranted(current)) {
      await healSetupIfOsGranted();
      return;
    }
    if (current.status === Location.PermissionStatus.DENIED && current.canAskAgain === false) {
      return;
    }
    const result = await ensureForegroundLocationPermission();
    if (result.granted) {
      await healSetupIfOsGranted();
    }
  } catch {
    // Login must never be blocked by location.
  }
}

/** Kept for API compatibility. Logout must not reset OS permission or force a re-prompt. */
export function resetFieldTrackingSetupOfferSession(): void {
  offeredThisSession = false;
}

/** Work Day / visit callers should prefer startWorkDayWithLocationGate. */
export async function ensureFieldTrackingReadyForWorkday(): Promise<boolean> {
  try {
    const result = await ensureForegroundLocationPermission();
    return result.granted;
  } catch {
    return false;
  }
}

/**
 * Unused in normal routing. Exceptional recovery helper — not called after login.
 */
export function showFieldTrackingNeedsAttentionAlert(
  onPrimary?: () => void
): void {
  Alert.alert(
    "Location Required",
    "Location is required to record field work.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Allow Location",
        onPress: () => {
          void (async () => {
            const result = await ensureForegroundLocationPermission().catch(() => undefined);
            if (result?.granted) {
              onPrimary?.();
            }
          })();
        }
      }
    ]
  );
}
