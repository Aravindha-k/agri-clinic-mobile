import * as Location from "expo-location";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { LocationPushPayload } from "../api/tracking";
import { isBackgroundLocationTrackingActive } from "../tracking/backgroundLocationService";
import { isDutyTrackingSessionActive } from "../tracking/trackingSession";
import { getActiveDutySessionId, getActiveWorkdayId } from "../storage/workdaySessionStorage";
import { getActiveSyncUserId } from "../storage/queueOwnership";
import { readLocationServicesEnabled } from "./locationServicesProbe";
import { generateLocalHeartbeatId } from "../../mobile/lib/sync/queueIds";

/** Values sent to backend/admin for permission diagnostics. */
export type LocationPermissionStatus =
  | "granted"
  | "foreground_only"
  | "denied"
  | "undetermined"
  | "services_disabled";

/**
 * Canonical tracking heartbeat / GPS health report.
 * Admin Online/Stale/Offline must use recorded_at (heartbeat), not last location alone.
 */
export type GpsStateReport = {
  gps_enabled: boolean;
  location_permission_status: LocationPermissionStatus;
  /** True when the workday FGS / background location task is running. */
  background_tracking_enabled: boolean;
  /** Alias for admin contract — same as background_tracking_enabled while duty active. */
  tracking_service_active: boolean;
  permission_granted: boolean;
  recorded_at: string;
  duty_session_id?: number | null;
  workday_id?: number | null;
  employee_id?: number | null;
  user_id?: number | null;
  /** Optional latest accuracy meters — never invent coordinates. */
  accuracy?: number | null;
  /** Active / background / inactive — for Admin diagnostics. */
  app_state?: string;
  network_available?: boolean;
  client_heartbeat_id?: string;
};

export type GpsStateReportOptions = {
  /** When false, force gps_enabled off (e.g. last fix failed). */
  gpsEnabledHint?: boolean;
  accuracy?: number | null;
  clientHeartbeatId?: string;
};

export async function getGpsStateReport(options?: GpsStateReportOptions): Promise<GpsStateReport> {
  const recorded_at = new Date().toISOString();
  let servicesEnabled = false;
  try {
    servicesEnabled = await readLocationServicesEnabled();
  } catch {
    servicesEnabled = false;
  }

  const [workdayId, dutySessionId] = await Promise.all([
    getActiveWorkdayId().catch(() => null),
    getActiveDutySessionId().catch(() => null)
  ]);
  const employeeId = getActiveSyncUserId();

  let network_available = true;
  try {
    const net = await NetInfo.fetch();
    network_available = Boolean(net.isConnected && net.isInternetReachable !== false);
  } catch {
    network_available = true;
  }

  const app_state = String(AppState.currentState || "unknown");
  const client_heartbeat_id = options?.clientHeartbeatId || generateLocalHeartbeatId();

  let backgroundTaskRunning = false;
  try {
    backgroundTaskRunning = await isBackgroundLocationTrackingActive();
  } catch {
    backgroundTaskRunning = false;
  }

  const tracking_service_active =
    backgroundTaskRunning && (isDutyTrackingSessionActive() || Boolean(dutySessionId));

  if (!servicesEnabled) {
    return {
      gps_enabled: false,
      location_permission_status: "services_disabled",
      background_tracking_enabled: backgroundTaskRunning,
      tracking_service_active,
      permission_granted: false,
      recorded_at,
      duty_session_id: dutySessionId,
      workday_id: workdayId,
      employee_id: employeeId,
      user_id: employeeId,
      accuracy: options?.accuracy ?? null,
      app_state,
      network_available,
      client_heartbeat_id
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

  const permission_granted = foreground.status === "granted";
  let gps_enabled = servicesEnabled && permission_granted;

  if (options?.gpsEnabledHint === false) {
    gps_enabled = false;
  }

  return {
    gps_enabled,
    location_permission_status,
    background_tracking_enabled: backgroundTaskRunning,
    tracking_service_active,
    permission_granted,
    recorded_at,
    duty_session_id: dutySessionId,
    workday_id: workdayId,
    employee_id: employeeId,
    user_id: employeeId,
    accuracy:
      typeof options?.accuracy === "number" && Number.isFinite(options.accuracy)
        ? options.accuracy
        : null,
    app_state,
    network_available,
    client_heartbeat_id
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
