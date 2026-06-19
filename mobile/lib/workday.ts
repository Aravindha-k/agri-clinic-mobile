import {
  ensureActiveWorkday,
  type WorkdayStatus
} from "../../src/api/tracking";
import { saveDutySessionFromWorkday } from "../../src/storage/workdaySessionStorage";
import {
  startBackgroundLocationTracking,
  type StartBackgroundTrackingResult
} from "../../src/tracking/backgroundLocationService";
import { markDutyTrackingSessionActive } from "../../src/tracking/trackingSession";
import { ensureTrackingPermissions, getForegroundLocation } from "../../src/utils/location";
import type { LocationObject } from "expo-location";

export type WorkdayLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export type StartWorkdayResult =
  | {
      ok: true;
      workday: WorkdayStatus;
      coords: WorkdayLocation;
      foregroundLocation: LocationObject;
      background: StartBackgroundTrackingResult;
    }
  | {
      ok: false;
      reason: "blocked" | "permissions" | "location" | "api";
      message?: string;
    };

export type StartWorkdayOptions = {
  ensureWorkAllowed: (actionLabel: string) => boolean;
  actionLabel?: string;
  onBackgroundPermissionWarning?: (message: string) => void;
};

/**
 * Shared duty start: permissions → GPS fix → POST duty/start → background tracking.
 * TrackingContext applies UI state and foreground sync loops after this returns.
 */
export async function startWorkday(options: StartWorkdayOptions): Promise<StartWorkdayResult> {
  const actionLabel = options.actionLabel ?? "start your workday";
  if (!options.ensureWorkAllowed(actionLabel)) {
    return { ok: false, reason: "blocked" };
  }

  const permissions = await ensureTrackingPermissions();
  if (!permissions.foreground) {
    return {
      ok: false,
      reason: "permissions",
      message: permissions.message || "Location permission is required."
    };
  }
  if (!permissions.background) {
    options.onBackgroundPermissionWarning?.(
      permissions.message || "Allow location all the time for route tracking."
    );
  }

  const locationResult = await getForegroundLocation();
  if (!locationResult.granted) {
    return {
      ok: false,
      reason: "location",
      message: locationResult.message
    };
  }

  const coords: WorkdayLocation = {
    latitude: locationResult.location.coords.latitude,
    longitude: locationResult.location.coords.longitude,
    accuracy: locationResult.location.coords.accuracy
  };

  try {
    const workday = await ensureActiveWorkday(coords);
    await saveDutySessionFromWorkday(workday);
    markDutyTrackingSessionActive(true);
    const background = await startBackgroundLocationTracking();
    return {
      ok: true,
      workday,
      coords,
      foregroundLocation: locationResult.location,
      background
    };
  } catch (err) {
    const message =
      err instanceof Error && err.message.trim() ? err.message : "Unable to start workday.";
    return { ok: false, reason: "api", message };
  }
}
