/**
 * Classified location / permission failure states.
 * Never treat all location failures as one generic error.
 */

export type LocationIssueState =
  | "ready"
  | "foreground_permission_missing"
  | "foreground_permission_denied"
  | "foreground_permission_blocked"
  | "precise_location_disabled"
  | "background_permission_missing"
  | "notification_permission_missing"
  | "location_services_disabled"
  | "battery_restricted"
  | "unsupported_in_expo_go"
  | "temporarily_unavailable"
  | "capture_timeout"
  | "unknown_error";

export type LocationRecoveryAction =
  | "allow_location"
  | "open_settings"
  | "open_app_settings"
  | "turn_on_location"
  | "retry"
  | "go_back"
  | "not_now"
  | "cancel";

export type LocationRecoveryCopy = {
  state: LocationIssueState;
  title: string;
  message: string;
  primary: { label: string; action: LocationRecoveryAction };
  secondary: { label: string; action: LocationRecoveryAction };
};

/** Employee-facing recovery copy — no raw Android permission names. */
export function recoveryCopyForState(state: LocationIssueState): LocationRecoveryCopy {
  switch (state) {
    case "foreground_permission_missing":
    case "foreground_permission_denied":
      return {
        state,
        title: "Location access needed",
        message: "Kavya Field needs location access to record your field visit.",
        primary: { label: "Allow Location", action: "allow_location" },
        secondary: { label: "Not Now", action: "not_now" }
      };
    case "foreground_permission_blocked":
      return {
        state,
        title: "Location access is blocked",
        message:
          "Location permission is disabled for Kavya Agri Clinic.",
        primary: { label: "Open Settings", action: "open_app_settings" },
        secondary: { label: "Cancel", action: "cancel" }
      };
    case "background_permission_missing":
      // Legacy state — foreground-only product; guide to Enable Location.
      return {
        state,
        title: "Location access needed",
        message: "Enable location to continue field tracking.",
        primary: { label: "Enable Location", action: "allow_location" },
        secondary: { label: "Not Now", action: "not_now" }
      };
    case "precise_location_disabled":
      return {
        state,
        title: "Turn on Precise Location",
        message: "Precise location is needed to record the correct field location.",
        primary: { label: "Open Settings", action: "open_settings" },
        secondary: { label: "Cancel", action: "cancel" }
      };
    case "location_services_disabled":
      return {
        state,
        title: "Phone location is turned off",
        message: "Turn on phone location to continue.",
        primary: { label: "Turn On Location", action: "turn_on_location" },
        secondary: { label: "Cancel", action: "cancel" }
      };
    case "notification_permission_missing":
      return {
        state,
        title: "Tracking notification needed",
        message: "Allow notifications so Kavya Field can show the active workday notice.",
        primary: { label: "Open Settings", action: "open_app_settings" },
        secondary: { label: "Cancel", action: "cancel" }
      };
    case "unsupported_in_expo_go":
      return {
        state,
        title: "Limited in Expo Go",
        message:
          "Background tracking needs a development build or field APK. Foreground features still work.",
        primary: { label: "Continue", action: "not_now" },
        secondary: { label: "Cancel", action: "cancel" }
      };
    case "capture_timeout":
    case "temporarily_unavailable":
      return {
        state,
        title: "Couldn’t get your location",
        message: "Move to an open area and try again.",
        primary: { label: "Retry", action: "retry" },
        secondary: { label: "Go Back", action: "go_back" }
      };
    case "battery_restricted":
      return {
        state,
        title: "Background battery access",
        message: "Allow Kavya Field to run in the background so tracking continues while locked.",
        primary: { label: "Open Settings", action: "open_settings" },
        secondary: { label: "Cancel", action: "cancel" }
      };
    case "ready":
      return {
        state,
        title: "Location ready",
        message: "Location access is ready.",
        primary: { label: "Continue", action: "not_now" },
        secondary: { label: "Cancel", action: "cancel" }
      };
    default:
      return {
        state: "unknown_error",
        title: "Location unavailable",
        message: "Something went wrong checking location. Try again or open Settings.",
        primary: { label: "Retry", action: "retry" },
        secondary: { label: "Cancel", action: "cancel" }
      };
  }
}

export function logLocationPermission(
  event:
    | "probe_result"
    | "request_started"
    | "request_denied"
    | "settings_opened"
    | "app_resumed_recheck"
    | "ready"
    | "prompt_suppressed_cooldown"
    | "prompt_cancelled",
  detail?: Record<string, unknown>
) {
  // eslint-disable-next-line no-console
  console.log(`[LocationPermission] ${event}`, detail ?? {});
}
