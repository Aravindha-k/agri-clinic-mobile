import * as Location from "expo-location";
import type { LocationPushPayload } from "../api/tracking";
import { isBackgroundLocationTrackingActive } from "../tracking/backgroundLocationService";

/** Values sent to backend/admin for permission diagnostics. */
export type LocationPermissionStatus =
  | "granted"
  | "foreground_only"
  | "denied"
  | "undetermined"
  | "services_disabled";

export type GpsStateReport = {
  gps_enabled: boolean;
  location_permission_status: LocationPermissionStatus;
  background_tracking_enabled: boolean;
};

export type GpsStateReportOptions = {
  /** When false, force gps_enabled off (e.g. last fix failed). */
  gpsEnabledHint?: boolean;
};

export async function getGpsStateReport(options?: GpsStateReportOptions): Promise<GpsStateReport> {
  let servicesEnabled = false;
  try {
    servicesEnabled = await Location.hasServicesEnabledAsync();
  } catch {
    servicesEnabled = false;
  }

  if (!servicesEnabled) {
    return {
      gps_enabled: false,
      location_permission_status: "services_disabled",
      background_tracking_enabled: false
    };
  }

  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();

  let location_permission_status: LocationPermissionStatus;
  if (foreground.status === "granted") {
    location_permission_status =
      background.status === "granted" ? "granted" : "foreground_only";
  } else if (foreground.status === "denied" && !foreground.canAskAgain) {
    location_permission_status = "denied";
  } else {
    location_permission_status = "undetermined";
  }

  let backgroundTaskRunning = false;
  try {
    backgroundTaskRunning = await isBackgroundLocationTrackingActive();
  } catch {
    backgroundTaskRunning = false;
  }

  const background_tracking_enabled =
    background.status === "granted" && backgroundTaskRunning;

  let gps_enabled = servicesEnabled && foreground.status === "granted";

  if (options?.gpsEnabledHint === false) {
    gps_enabled = false;
  }

  return {
    gps_enabled,
    location_permission_status,
    background_tracking_enabled
  };
}

export async function enrichLocationPushPayload(
  payload: LocationPushPayload,
  options?: GpsStateReportOptions
): Promise<LocationPushPayload> {
  if (
    payload.gps_enabled != null &&
    payload.location_permission_status != null &&
    payload.background_tracking_enabled != null
  ) {
    return payload;
  }
  const state = await getGpsStateReport(options);
  return {
    ...payload,
    gps_enabled: state.gps_enabled,
    location_permission_status: state.location_permission_status,
    background_tracking_enabled: state.background_tracking_enabled
  };
}
