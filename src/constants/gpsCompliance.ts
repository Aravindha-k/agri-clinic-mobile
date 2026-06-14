/** GPS compliance timing for field work (Kavya Field). */
export const GPS_REMINDER_INTERVAL_MS = 5 * 60 * 1000;
export const GPS_BLOCK_AFTER_MS = 30 * 60 * 1000;
/** How often we probe device GPS / permission state. */
export const GPS_PROBE_INTERVAL_MS = 60 * 1000;

export const GPS_REMINDER_MESSAGE =
  "Location is required for field work. Please turn on GPS to continue tracking and visits.";

export const GPS_BLOCKED_MESSAGE =
  "Location has been off for 30 minutes. Turn on GPS to start your workday, record visits, and sync tracking again.";

export const GPS_PERMISSION_MESSAGE =
  "Location permission is required. Open Settings, allow location access for this app, then return and try again.";
