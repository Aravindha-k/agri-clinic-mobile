import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import { AppState } from "react-native";
import { BACKGROUND_LOCATION_TASK } from "../tracking/registerBackgroundLocationTask";
import { flushGpsBuffer, startGpsTrackingService, stopGpsTrackingService } from "../../mobile/lib/gps/trackingService";
import { cancelBackgroundFieldSync } from "../../mobile/lib/sync/syncScheduler";
import { cancelForegroundSyncRetries } from "../../mobile/lib/sync/syncRetryScheduler";
import { getFieldPendingCounts } from "../../mobile/lib/sync/pendingCounts";
import { refreshSyncStoreCounts } from "../../mobile/lib/sync/offlineSyncManager";
import { useDuty } from "../features/duty/store/DutyContext";
import { useDutyTimer } from "../features/duty/hooks/useDutyTimer";
import { handleLocationUpdate } from "../tracking/locationSyncService";
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from "../tracking/backgroundLocationService";
import {
  getForegroundPollIntervalMs,
  isLocationMoving,
  setTrackingBatterySaverEnabled
} from "../tracking/trackingConfig";
import {
  markDutyTrackingSessionActive,
  markForegroundPollActive,
  setTrackingMotionState
} from "../tracking/trackingSession";
import { registerPreSignOut } from "./preSignOut";
import { registerSessionExpiredTeardown } from "./sessionExpired";
import { registerSessionTeardown } from "./sessionConflict";
import { useAppPreferences } from "./AppPreferencesContext";
import { readLocationServicesEnabled } from "../utils/locationServicesProbe";
import { trackingDevLog } from "../tracking/trackingDevLog";

type GpsState = "unknown" | "granted" | "denied";

type CurrentLocation = {
  latitude: string;
  longitude: string;
  accuracy?: number | null;
};

type TrackingContextValue = {
  busy: boolean;
  trackingReady: boolean;
  gpsState: GpsState;
  gpsEnabled: boolean;
  permissionDenied: boolean;
  foregroundTrackingActive: boolean;
  backgroundTrackingActive: boolean;
  pendingGpsCount: number;
  currentLocation: CurrentLocation | null;
  error: string;
  isActive: boolean;
  workdaySessionStatus: "not_started" | "in_progress" | "completed";
  workdaySessionHydrated: boolean;
  workdayServerReconciled: boolean;
  timerDisplay: string;
  startedAt: string | null;
  lastSyncTime: string | null;
  pendingSyncCount: number;
  loading: boolean;
  nextSyncAt: string | null;
  elapsedDuration: string;
  syncIntervalMinutes: number;
  workdayInactiveBanner: string | null;
  workday: ReturnType<typeof useDuty>["currentDuty"];
  refreshTracking: () => Promise<void>;
  retryForegroundSync: () => Promise<void>;
  startDay: () => Promise<ReturnType<typeof useDuty>["currentDuty"]>;
  endDay: () => Promise<ReturnType<typeof useDuty>["currentDuty"]>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  flushGpsQueue: () => Promise<{ synced: number }>;
  refreshTrackingState: () => Promise<void>;
};

type TrackingBridge = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  flush: () => Promise<{ synced: number }>;
};

const TrackingContext = createContext<TrackingContextValue | undefined>(undefined);

let trackingBridge: TrackingBridge | null = null;

export function startTrackingBridge() {
  return trackingBridge?.start() ?? Promise.resolve();
}

export function stopTrackingBridge() {
  return trackingBridge?.stop() ?? Promise.resolve();
}

export function flushTrackingGpsQueue() {
  return trackingBridge?.flush() ?? Promise.resolve({ synced: 0 });
}

function normalizeLocation(location: Location.LocationObject | null): CurrentLocation | null {
  if (!location) return null;
  return {
    latitude: location.coords.latitude.toFixed(6),
    longitude: location.coords.longitude.toFixed(6),
    accuracy: location.coords.accuracy ?? null
  };
}

async function readCurrentFix() {
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: false
    });
  } catch {
    try {
      return await Location.getLastKnownPositionAsync();
    } catch {
      return null;
    }
  }
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const duty = useDuty();
  const { currentDuty, startDuty, endDuty } = duty;
  const dutyTimer = useDutyTimer();
  const { trackingBatterySaver } = useAppPreferences();
  const [busy, setBusy] = useState(false);
  const [gpsState, setGpsState] = useState<GpsState>("unknown");
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [foregroundTrackingActive, setForegroundTrackingActive] = useState(false);
  const [backgroundTrackingActive, setBackgroundTrackingActive] = useState(false);
  const [pendingGpsCount, setPendingGpsCount] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [error, setError] = useState("");
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const activeDutyRef = useRef(currentDuty);
  activeDutyRef.current = currentDuty;

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    markForegroundPollActive(false);
  }, []);

  const syncPendingGpsCount = useCallback(() => {
    refreshSyncStoreCounts();
    setPendingGpsCount(getFieldPendingCounts().gps);
  }, []);

  const refreshTrackingState = useCallback(async () => {
    const [permission, servicesEnabled, backgroundActive, location] = await Promise.all([
      Location.getForegroundPermissionsAsync().catch(() => null),
      readLocationServicesEnabled().catch(() => false),
      Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false),
      Location.getLastKnownPositionAsync().catch(() => null)
    ]);
    const granted = permission?.status === "granted";
    setGpsState(granted ? "granted" : permission?.status === "denied" ? "denied" : "unknown");
    setPermissionDenied(permission?.status === "denied");
    setGpsEnabled(Boolean(servicesEnabled));
    setBackgroundTrackingActive(Boolean(backgroundActive));
    setCurrentLocation(normalizeLocation(location));
    syncPendingGpsCount();
  }, [syncPendingGpsCount]);

  const stopTracking = useCallback(async () => {
    clearPollTimer();
    markDutyTrackingSessionActive(false);
    setForegroundTrackingActive(false);
    await stopBackgroundLocationTracking().catch(() => undefined);
    setBackgroundTrackingActive(false);
    stopGpsTrackingService();
    syncPendingGpsCount();
    trackingDevLog("tracking_stopped", "stopTracking");
  }, [clearPollTimer, syncPendingGpsCount]);

  const pollOnce = useCallback(async () => {
    const duty = activeDutyRef.current;
    if (!duty?.is_active) {
      await stopTracking();
      return;
    }

    try {
      const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (permission?.status !== "granted") {
        trackingDevLog("tracking_stopped_permission_revoked", "foreground_poll");
        setGpsState("denied");
        setPermissionDenied(true);
        await stopBackgroundLocationTracking().catch(() => undefined);
        setBackgroundTrackingActive(false);
        // Keep unsynced queue; do not crash; reschedule a slow recheck.
        markForegroundPollActive(true);
        pollTimerRef.current = setTimeout(() => {
          void pollOnce();
        }, 30_000);
        return;
      }

      const location = await readCurrentFix();
      if (location) {
        setCurrentLocation(normalizeLocation(location));
        const moving = isLocationMoving(location.coords.speed ?? null);
        setTrackingMotionState(moving);
        await handleLocationUpdate(location).catch(() => undefined);
        syncPendingGpsCount();
        const nextDelay = getForegroundPollIntervalMs(moving);
        markForegroundPollActive(true);
        pollTimerRef.current = setTimeout(() => {
          void pollOnce();
        }, nextDelay);
        return;
      }

      // Temporary GPS miss — keep polling, do not freeze tracking.
      markForegroundPollActive(true);
      pollTimerRef.current = setTimeout(() => {
        void pollOnce();
      }, 15_000);
    } catch {
      markForegroundPollActive(true);
      pollTimerRef.current = setTimeout(() => {
        void pollOnce();
      }, 20_000);
    }
  }, [stopTracking, syncPendingGpsCount]);

  const startTracking = useCallback(async () => {
    if (startingRef.current || !activeDutyRef.current?.is_active) {
      return;
    }

    startingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
      const servicesEnabled = await readLocationServicesEnabled().catch(() => false);
      const granted = permission?.status === "granted";
      setGpsState(granted ? "granted" : permission?.status === "denied" ? "denied" : "unknown");
      setPermissionDenied(permission?.status === "denied");
      setGpsEnabled(Boolean(servicesEnabled));

      if (!granted || !servicesEnabled) {
        trackingDevLog(
          "tracking_deferred_permission_missing",
          !servicesEnabled ? "services_disabled" : "foreground_missing"
        );
        setError(
          !servicesEnabled
            ? "Phone location is turned off."
            : "Location access is needed for workday tracking."
        );
        // Do not start native tracking or pretend the session is active.
        return;
      }

      markDutyTrackingSessionActive(true);
      startGpsTrackingService({ isGpsEnabled: () => servicesEnabled && granted });
      setForegroundTrackingActive(true);
      clearPollTimer();

      const firstFix = await readCurrentFix();
      if (firstFix) {
        setCurrentLocation(normalizeLocation(firstFix));
        setTrackingMotionState(isLocationMoving(firstFix.coords.speed ?? null));
        // Non-force: Start Work Day already pushed a confirmation point; skip duplicate.
        await handleLocationUpdate(firstFix).catch(() => undefined);
      }

      const backgroundResult = await startBackgroundLocationTracking().catch(() => ({
        ok: false,
        alreadyRunning: false,
        expoGoLimited: false
      }));
      setBackgroundTrackingActive(Boolean(backgroundResult.ok || backgroundResult.alreadyRunning));
      syncPendingGpsCount();
      trackingDevLog(
        "tracking_started",
        backgroundResult.expoGoLimited
          ? "foreground_only_expo_go"
          : backgroundResult.alreadyRunning
            ? "already_running"
            : "native_background"
      );
      await pollOnce();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start GPS tracking.");
      trackingDevLog("tracking_deferred_permission_missing", "start_error");
    } finally {
      setBusy(false);
      startingRef.current = false;
    }
  }, [clearPollTimer, pollOnce, syncPendingGpsCount]);

  const flushGpsQueue = useCallback(async () => {
    const result = await flushGpsBuffer().catch(() => ({ synced: 0 }));
    syncPendingGpsCount();
    return result;
  }, [syncPendingGpsCount]);

  useEffect(() => {
    setTrackingBatterySaverEnabled(trackingBatterySaver);
  }, [trackingBatterySaver]);

  useEffect(() => {
    void refreshTrackingState();
  }, [refreshTrackingState]);

  useEffect(() => {
    trackingBridge = {
      start: startTracking,
      stop: stopTracking,
      flush: flushGpsQueue
    };
    return () => {
      if (trackingBridge?.start === startTracking) {
        trackingBridge = null;
      }
    };
  }, [flushGpsQueue, startTracking, stopTracking]);

  useEffect(() => {
    if (currentDuty?.is_active) {
      void startTracking();
    } else {
      void stopTracking();
    }
  }, [currentDuty?.duty_session_id, currentDuty?.is_active, startTracking, stopTracking]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        trackingDevLog("tracking_resume", "app_active");
        void (async () => {
          try {
            if (activeDutyRef.current?.is_active) {
              const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
              if (permission?.status !== "granted") {
                trackingDevLog("tracking_stopped_permission_revoked", "app_resume");
                setGpsState("denied");
                setPermissionDenied(true);
                await stopBackgroundLocationTracking().catch(() => undefined);
                setBackgroundTrackingActive(false);
                syncPendingGpsCount();
                await refreshTrackingState();
                return;
              }

              // Fresh fix for UI + route continuity after lock/minimize.
              const fix = await readCurrentFix();
              if (fix) {
                setCurrentLocation(normalizeLocation(fix));
                await handleLocationUpdate(fix).catch(() => undefined);
              }
              const result = await startBackgroundLocationTracking().catch(() => ({
                ok: false,
                alreadyRunning: false,
                expoGoLimited: false
              }));
              setBackgroundTrackingActive(Boolean(result.ok || result.alreadyRunning));
              // Single-flight queue flush (shared mutex with locationSyncService).
              await flushGpsQueue();
            }
            await refreshTrackingState();
          } catch {
            // Never crash on resume permission/GPS errors.
          }
        })();
        return;
      }

      // Screen lock / minimize: keep native background GPS running.
      if (
        (nextState === "background" || nextState === "inactive") &&
        activeDutyRef.current?.is_active
      ) {
        trackingDevLog("tracking_background", nextState);
        void startBackgroundLocationTracking()
          .then((result) => {
            setBackgroundTrackingActive(Boolean(result.ok || result.alreadyRunning));
          })
          .catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [flushGpsQueue, refreshTrackingState, syncPendingGpsCount]);

  useEffect(() => {
    const shutdown = async () => {
      await stopTracking();
      await cancelBackgroundFieldSync().catch(() => undefined);
      cancelForegroundSyncRetries();
    };
    const unregisters = [
      // Register early so SESSION_REPLACED / logout stop native GPS before queue clear.
      registerPreSignOut(shutdown),
      registerSessionTeardown(shutdown),
      registerSessionExpiredTeardown(shutdown)
    ];
    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [stopTracking]);

  const value = useMemo(() => {
    const workdaySessionStatus: TrackingContextValue["workdaySessionStatus"] = currentDuty?.is_active
      ? "in_progress"
      : currentDuty
        ? "completed"
        : "not_started";

    return {
      busy,
      trackingReady: true,
      gpsState,
      gpsEnabled,
      permissionDenied,
      foregroundTrackingActive,
      backgroundTrackingActive,
      pendingGpsCount,
      currentLocation,
      error,
      isActive: Boolean(currentDuty?.is_active),
      workdaySessionStatus,
      workdaySessionHydrated: true,
      workdayServerReconciled: true,
      timerDisplay: dutyTimer.elapsedDisplay,
      startedAt: currentDuty?.start_time ?? currentDuty?.started_at ?? null,
      lastSyncTime: duty.lastSyncedAt,
      pendingSyncCount: pendingGpsCount,
      loading: false,
      nextSyncAt: null,
      elapsedDuration: dutyTimer.elapsedDisplay,
      syncIntervalMinutes: 1,
      workdayInactiveBanner: null,
      workday: currentDuty,
      refreshTracking: refreshTrackingState,
      retryForegroundSync: async () => {
        await flushGpsQueue();
      },
      startDay: startDuty,
      endDay: endDuty,
      startTracking,
      stopTracking,
      flushGpsQueue,
      refreshTrackingState
    };
  },
    [
      backgroundTrackingActive,
      busy,
      currentLocation,
      currentDuty,
      duty,
      dutyTimer.elapsedDisplay,
      endDuty,
      error,
      flushGpsQueue,
      foregroundTrackingActive,
      gpsEnabled,
      gpsState,
      pendingGpsCount,
      permissionDenied,
      refreshTrackingState,
      startDuty,
      startTracking,
      stopTracking
    ]
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking() {
  const value = useContext(TrackingContext);
  if (!value) {
    throw new Error("useTracking must be used inside TrackingProvider");
  }
  return value;
}
