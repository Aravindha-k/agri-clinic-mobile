import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";
import { FIELD_MAX_WORKDAY_MS, FIELD_TRACKING_INTERVAL_MS, FIELD_TRACKING_INTERVAL_MINUTES } from "../constants/fieldTracking";
import {
  WORKDAY_EXPIRED_ALERT_MESSAGE,
  WORKDAY_INACTIVE_BANNER_MESSAGE,
  WORKDAY_REQUIRED_MESSAGE
} from "../constants/workdayMessages";
import { TRACKING_LOAD_ERROR, TRACKING_SYNC_ERROR } from "../constants/trackingMessages";
import {
  endWorkday,
  fetchCurrentWorkday,
  isWorkdayActive,
  syncLocationQueue,
  sendHeartbeat,
  type LocationPushPayload,
  WorkdayStatus
} from "../api/tracking";
import { clearLocationPushQueue, readLocationPushQueue } from "./locationPushQueue";
import { setLastSentRoutePoint } from "./lastSentRouteStorage";
import { ApiRequestError, getNetworkMessage, isNetworkError } from "../utils/apiError";
import { isWorkdayInactiveMessage } from "../utils/workdayStatus";
import { hasValidMapCoords } from "../utils/mapCoords";
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking
} from "../tracking/backgroundLocationService";
import {
  handleForcedLocationUpdate,
  handleLocationUpdate,
  resetRouteTrackingState
} from "../tracking/locationSyncService";
import { trackingDevLog } from "../tracking/trackingDevLog";
import { getForegroundLocation, toTrackingPayload } from "../utils/location";
import { subscribeConnectivity } from "../utils/connectivityBus";
import { useAuth, useAuthSessionReady } from "./AuthContext";
import { useGpsCompliance } from "./GpsComplianceContext";
import {
  clearCachedActiveWorkday,
  readCachedActiveWorkday,
  saveCachedActiveWorkday
} from "./workdaySessionStorage";
import { registerSessionExpiredTeardown } from "./sessionExpired";
import { registerSessionTeardown } from "./sessionConflict";
import {
  startGpsTrackingService,
  stopGpsTrackingService
} from "../../mobile/lib/gps/trackingService";
import { startWorkday } from "../../mobile/lib/workday";
import { getWorkdayStartTimestamp, resolveWorkdayStartedAt } from "../utils/workdayStartedAt";
import { workdayRestoreLog } from "../utils/workdayRestoreLog";

const TRACKING_INTERVAL_MS = FIELD_TRACKING_INTERVAL_MS;
const MAX_WORKDAY_DURATION_MS = FIELD_MAX_WORKDAY_MS;
const ELAPSED_TICK_MS = 60 * 1000;
const WORKDAY_SYNC_RETRY_MS = [2000, 5000, 10000] as const;

export type WorkdaySyncStatus = "idle" | "cached" | "syncing" | "confirmed" | "connecting";

type GpsState = "unknown" | "granted" | "denied";

type CurrentLocation = {
  latitude: string;
  longitude: string;
  accuracy?: number | null;
};

type TrackingContextValue = {
  busy: boolean;
  currentLocation: CurrentLocation | null;
  error: string;
  gpsState: GpsState;
  isActive: boolean;
  fieldLocationBlocked: boolean;
  elapsedDuration: string;
  lastSyncTime: string | null;
  nextSyncAt: string | null;
  pendingSyncCount: number;
  syncIntervalMinutes: number;
  loading: boolean;
  refreshTracking: () => Promise<void>;
  retryForegroundSync: () => Promise<void>;
  startDay: () => Promise<boolean>;
  endDay: () => Promise<void>;
  /** Returns false and shows alert when no active workday (visits, sync). */
  requireActiveWorkday: () => boolean;
  startedAt: string | null;
  workday: WorkdayStatus | null;
  trackingReady: boolean;
  workdayInactiveBanner: string | null;
  workdaySyncStatus: WorkdaySyncStatus;
  usingCachedWorkday: boolean;
  cachedDistanceKm: number;
  cachedRoutePoints: number;
};

const TrackingContext = createContext<TrackingContextValue | undefined>(undefined);

function runSafe(promise: Promise<unknown>) {
  void promise.catch(() => undefined);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  const sessionReady = useAuthSessionReady();
  const trackingReady = sessionReady;
  const workdayApiReady = isReady && isAuthenticated;
  const { ensureWorkAllowed, isWorkBlocked, notifyGpsGranted, refreshGpsStatus } = useGpsCompliance();
  const [workday, setWorkday] = useState<WorkdayStatus | null>(null);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [gpsState, setGpsState] = useState<GpsState>("unknown");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedNow, setElapsedNow] = useState(() => Date.now());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [workdayInactiveBanner, setWorkdayInactiveBanner] = useState<string | null>(null);
  const [workdaySyncStatus, setWorkdaySyncStatus] = useState<WorkdaySyncStatus>("idle");
  const [usingCachedWorkday, setUsingCachedWorkday] = useState(false);
  const [cachedDistanceKm, setCachedDistanceKm] = useState(0);
  const [cachedRoutePoints, setCachedRoutePoints] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncInFlightRef = useRef(false);
  const workdaySyncInFlightRef = useRef(false);
  const autoEndInFlightRef = useRef(false);
  const expiredAlertShownRef = useRef(false);
  const workdayRef = useRef<WorkdayStatus | null>(null);
  const workdayStartedAtRef = useRef<number | null>(null);

  workdayRef.current = workday;

  useEffect(() => {
    mountedRef.current = true;
    void readLocationPushQueue().then((q) => {
      if (mountedRef.current) {
        setPendingSyncCount(q.length);
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopForegroundLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopElapsedLoop = useCallback(() => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const stopAllTrackingLoops = useCallback(() => {
    stopForegroundLoop();
    stopElapsedLoop();
  }, [stopElapsedLoop, stopForegroundLoop]);

  const applyWorkday = useCallback((status: WorkdayStatus | null) => {
    setWorkday(status);
    const resolvedStart = resolveWorkdayStartedAt(status);
    setStartedAt(resolvedStart);

    if (status?.workday_id && resolvedStart) {
      void readCachedActiveWorkday().then((existing) => {
        void saveCachedActiveWorkday({
          workday_id: status.workday_id,
          started_at: resolvedStart,
          status: "working",
          last_known_distance: existing?.last_known_distance ?? 0,
          last_known_points: existing?.last_known_points ?? 0
        });
      });
      setUsingCachedWorkday(false);
    } else if (!status) {
      void clearCachedActiveWorkday();
      setUsingCachedWorkday(false);
      setCachedDistanceKm(0);
      setCachedRoutePoints(0);
    }
    const last = status?.last_location;
    if (last && hasValidMapCoords(last.latitude, last.longitude)) {
      setCurrentLocation({
        latitude: String(last.latitude),
        longitude: String(last.longitude),
        accuracy: last.accuracy
      });
      setLastSyncTime(last.recorded_at || status?.last_heartbeat || null);
      return;
    }
    setCurrentLocation(null);
    setLastSyncTime(status?.last_heartbeat || null);
  }, []);

  const clearWorkdayState = useCallback(
    (options?: { showExpiredAlert?: boolean; showInactiveBanner?: boolean }) => {
      stopAllTrackingLoops();
      void stopBackgroundLocationTracking();
      applyWorkday(null);
      setCurrentLocation(null);
      setLastSyncTime(null);
      setPendingSyncCount(0);
      void clearLocationPushQueue();
      void resetRouteTrackingState();
      stopGpsTrackingService();
      workdayStartedAtRef.current = null;
      setError("");
      if (options?.showInactiveBanner) {
        setWorkdayInactiveBanner(WORKDAY_INACTIVE_BANNER_MESSAGE);
      }
      if (options?.showExpiredAlert && !expiredAlertShownRef.current) {
        expiredAlertShownRef.current = true;
        Alert.alert("Workday ended", WORKDAY_EXPIRED_ALERT_MESSAGE);
      }
    },
    [applyWorkday, stopAllTrackingLoops]
  );

  const teardownTracking = useCallback(() => {
    stopAllTrackingLoops();
    void stopBackgroundLocationTracking();
    applyWorkday(null);
    setCurrentLocation(null);
    setLastSyncTime(null);
    setPendingSyncCount(0);
    setGpsState("unknown");
    setError("");
    setWorkdayInactiveBanner(null);
    syncInFlightRef.current = false;
    void clearLocationPushQueue();
    void resetRouteTrackingState();
    stopGpsTrackingService();
  }, [applyWorkday, stopAllTrackingLoops]);

  useEffect(() => {
    return registerSessionTeardown(teardownTracking);
  }, [teardownTracking]);

  useEffect(() => {
    return registerSessionExpiredTeardown(teardownTracking);
  }, [teardownTracking]);

  const autoEndWorkday = useCallback(async () => {
    if (autoEndInFlightRef.current) {
      return;
    }

    autoEndInFlightRef.current = true;
    try {
      stopAllTrackingLoops();
      try {
        await endWorkday();
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (!isWorkdayInactiveMessage(message)) {
          throw err;
        }
      }
      clearWorkdayState({ showExpiredAlert: true });
    } catch {
      clearWorkdayState({ showExpiredAlert: true });
    } finally {
      autoEndInFlightRef.current = false;
    }
  }, [clearWorkdayState, stopAllTrackingLoops]);

  const enforceMaxWorkdayDuration = useCallback(async () => {
    if (!isWorkdayActive(workday)) {
      return false;
    }

    const startTime = getWorkdayStartTimestamp(startedAt);
    if (!startTime) {
      return false;
    }

    if (Date.now() - startTime >= MAX_WORKDAY_DURATION_MS) {
      await autoEndWorkday();
      return true;
    }

    return false;
  }, [autoEndWorkday, startedAt, workday]);

  const syncWorkdayFromServer = useCallback(
    async (options?: { showExpiredAlert?: boolean }) => {
      if (workdaySyncInFlightRef.current) {
        return;
      }

      workdaySyncInFlightRef.current = true;
      setWorkdaySyncStatus((prev) => (prev === "confirmed" ? "syncing" : prev === "idle" ? "syncing" : prev));
      workdayRestoreLog("workday_current_api_start");

      let result: Awaited<ReturnType<typeof fetchCurrentWorkday>> | null = null;

      for (let attempt = 0; attempt <= WORKDAY_SYNC_RETRY_MS.length; attempt += 1) {
        if (attempt > 0) {
          await delay(WORKDAY_SYNC_RETRY_MS[attempt - 1]);
        }
        try {
          result = await fetchCurrentWorkday();
          workdayRestoreLog("workday_current_api_success", `kind=${result.kind}`);
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err ?? "unknown");
          workdayRestoreLog("workday_current_api_failed", `attempt=${attempt + 1} ${message}`);
        }
      }

      try {
        if (!result) {
          if (isWorkdayActive(workdayRef.current)) {
            workdayRestoreLog("using_cached_workday");
            setUsingCachedWorkday(true);
            setWorkdaySyncStatus("connecting");
          }
          return;
        }

        if (result.kind === "active") {
          expiredAlertShownRef.current = false;
          setWorkdayInactiveBanner(null);
          workdayStartedAtRef.current = null;
          applyWorkday(result.workday);
          setWorkdaySyncStatus("confirmed");
          return;
        }

        const hadCached = Boolean(await readCachedActiveWorkday());
        clearWorkdayState({
          showExpiredAlert: Boolean(options?.showExpiredAlert && result.kind === "expired"),
          showInactiveBanner: result.kind === "expired"
        });
        if (hadCached) {
          workdayRestoreLog("cleared_stale_workday", result.kind);
        }
        setWorkdaySyncStatus("idle");
      } finally {
        workdaySyncInFlightRef.current = false;
      }
    },
    [applyWorkday, clearWorkdayState]
  );

  const refreshTracking = useCallback(
    async (options?: { showExpiredAlert?: boolean }) => {
      if (!workdayApiReady) {
        return;
      }

      try {
        setError("");
        await syncWorkdayFromServer(options);
      } catch {
        setError(TRACKING_LOAD_ERROR);
        if (isWorkdayActive(workdayRef.current)) {
          setWorkdaySyncStatus("connecting");
        }
      }
    },
    [syncWorkdayFromServer, workdayApiReady]
  );

  const applyLastQueuedLocation = useCallback((payload: LocationPushPayload) => {
    if (!mountedRef.current) return;
    setGpsState("granted");
    setCurrentLocation({
      latitude: String(payload.latitude),
      longitude: String(payload.longitude),
      accuracy: payload.accuracy ?? null
    });
    setLastSyncTime(payload.captured_at || payload.recorded_at || null);
    setError("");
  }, []);

  const flushPendingLocationQueue = useCallback(async () => {
    if (!isWorkdayActive(workday)) {
      return;
    }
    try {
      const queue = await readLocationPushQueue();
      if (!queue.length) {
        if (mountedRef.current) {
          setPendingSyncCount(0);
        }
        return;
      }
      await syncLocationQueue(queue);
      await clearLocationPushQueue();
      const last = queue[queue.length - 1];
      const lastTs = Date.parse(last.captured_at);
      await setLastSentRoutePoint({
        latitude: last.latitude,
        longitude: last.longitude,
        accuracy: last.accuracy ?? null,
        speed: last.speed ?? null,
        timestamp: Number.isFinite(lastTs) ? lastTs : Date.now()
      });
      if (mountedRef.current) {
        setPendingSyncCount(0);
        applyLastQueuedLocation(last);
      }
    } catch {
      const remaining = await readLocationPushQueue();
      if (mountedRef.current) {
        setPendingSyncCount(remaining.length);
      }
    }
  }, [applyLastQueuedLocation, workday]);

  const pushCapturedLocation = useCallback(
    async (location: Parameters<typeof toTrackingPayload>[0]) => {
      try {
        const result = await handleLocationUpdate(location);
        if (result === "skipped") {
          return;
        }
        const payload = toTrackingPayload(location, workday?.workday_id);
        if (mountedRef.current) {
          if (result === "sent") {
            setPendingSyncCount(0);
            applyLastQueuedLocation(payload);
          } else {
            const queue = await readLocationPushQueue();
            setPendingSyncCount(queue.length);
          }
        }
        if (result === "queued") {
          throw new Error(TRACKING_SYNC_ERROR);
        }
        await sendHeartbeat(true).catch(() => undefined);
      } catch (err) {
        const queue = await readLocationPushQueue();
        if (mountedRef.current) {
          setPendingSyncCount(queue.length);
        }
        if (err instanceof Error && err.message !== "Invalid GPS coordinates") {
          throw new Error(TRACKING_SYNC_ERROR);
        }
        throw err;
      }
    },
    [applyLastQueuedLocation, workday?.workday_id]
  );

  const syncForegroundLocation = useCallback(async () => {
    if (syncInFlightRef.current || isWorkBlocked || !isWorkdayActive(workday)) {
      return;
    }

    syncInFlightRef.current = true;
    try {
      if (await enforceMaxWorkdayDuration()) {
        return;
      }

      try {
        await flushPendingLocationQueue();
      } catch {
        /* queued points remain for next attempt */
      }

      let result: Awaited<ReturnType<typeof getForegroundLocation>>;
      try {
        result = await getForegroundLocation();
      } catch {
        setError(TRACKING_SYNC_ERROR);
        return;
      }

      if (!result.granted) {
        setGpsState("denied");
        await sendHeartbeat(false).catch(() => undefined);
        setError(result.message);
        return;
      }

      try {
        await pushCapturedLocation(result.location);
        setError("");
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (isWorkdayInactiveMessage(message)) {
          clearWorkdayState({ showExpiredAlert: /auto-ended|9 hours/i.test(message) });
          return;
        }
        setError(TRACKING_SYNC_ERROR);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isWorkdayInactiveMessage(message)) {
        clearWorkdayState({ showExpiredAlert: /auto-ended|9 hours/i.test(message) });
        return;
      }
      setError(TRACKING_SYNC_ERROR);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [clearWorkdayState, enforceMaxWorkdayDuration, flushPendingLocationQueue, isWorkBlocked, pushCapturedLocation, workday]);

  const startForegroundLoop = useCallback(() => {
    if (intervalRef.current) {
      return;
    }
    intervalRef.current = setInterval(() => {
      runSafe(syncForegroundLocation());
    }, TRACKING_INTERVAL_MS);
  }, [syncForegroundLocation]);

  const startElapsedLoop = useCallback(() => {
    if (elapsedIntervalRef.current) {
      return;
    }
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedNow(Date.now());
      runSafe(enforceMaxWorkdayDuration());
    }, ELAPSED_TICK_MS);
  }, [enforceMaxWorkdayDuration]);

  const resumeActiveWorkdayTracking = useCallback(async () => {
    const bg = await startBackgroundLocationTracking();
    if (bg.ok || bg.alreadyRunning) {
      stopForegroundLoop();
      return;
    }
    startForegroundLoop();
  }, [startForegroundLoop, stopForegroundLoop]);

  const startDay = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      setError("");
      const started = await startWorkday({
        ensureWorkAllowed,
        onBackgroundPermissionWarning: (message) => {
          Alert.alert("Background location", message);
        }
      });

      if (!started.ok) {
        if (started.reason === "permissions" || started.reason === "location") {
          setGpsState("denied");
          Alert.alert("Location unavailable", started.message || "Location permission is required.");
        } else if (started.reason === "api") {
          const message = started.message || TRACKING_SYNC_ERROR;
          setError(message);
          Alert.alert("Unable to start work", message);
        }
        return false;
      }

      const { workday: activeWorkday, foregroundLocation, background: bg } = started;

      notifyGpsGranted();
      void refreshGpsStatus();

      expiredAlertShownRef.current = false;
      setWorkdayInactiveBanner(null);
      workdayStartedAtRef.current = Date.now();
      applyWorkday(activeWorkday);
      setCachedDistanceKm(0);
      setCachedRoutePoints(0);
      setGpsState("granted");
      trackingDevLog("workday_started", `workday_id=${activeWorkday.workday_id}`);

      const payload = toTrackingPayload(foregroundLocation, activeWorkday.workday_id);
      applyLastQueuedLocation(payload);

      try {
        const sendResult = await handleForcedLocationUpdate(foregroundLocation);
        if (mountedRef.current) {
          if (sendResult === "sent") {
            setPendingSyncCount(0);
          } else if (sendResult === "queued") {
            const queue = await readLocationPushQueue();
            setPendingSyncCount(queue.length);
          }
        }
      } catch {
        const queue = await readLocationPushQueue();
        if (mountedRef.current) {
          setPendingSyncCount(queue.length);
        }
      }

      if (bg.expoGoLimited) {
        // Expo Go cannot run background location tasks — foreground tracking still works.
      } else if (bg.message && !bg.ok && !bg.alreadyRunning) {
        Alert.alert("Route tracking", bg.message);
      }
      if (bg.ok || bg.alreadyRunning) {
        stopForegroundLoop();
      } else {
        startForegroundLoop();
      }
      startElapsedLoop();
      startGpsTrackingService({
        isGpsEnabled: () => gpsState !== "denied"
      });
      return true;
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : isNetworkError(err)
            ? getNetworkMessage()
            : err instanceof Error && err.message.trim()
              ? err.message
              : TRACKING_SYNC_ERROR;
      setError(message);
      Alert.alert("Unable to start work", message);
      return false;
    } finally {
      setBusy(false);
    }
  }, [
    applyLastQueuedLocation,
    applyWorkday,
    ensureWorkAllowed,
    notifyGpsGranted,
    refreshGpsStatus,
    startElapsedLoop,
    gpsState,
    startForegroundLoop,
    stopForegroundLoop
  ]);

  const requireActiveWorkday = useCallback(() => {
    if (isWorkdayActive(workday)) {
      return true;
    }
    Alert.alert("Workday required", WORKDAY_REQUIRED_MESSAGE);
    return false;
  }, [workday]);

  const endDay = useCallback(async () => {
    setBusy(true);
    try {
      stopAllTrackingLoops();
      await stopBackgroundLocationTracking();
      try {
        await flushPendingLocationQueue();
      } catch {
        /* keep queued points for next session */
      }
      await endWorkday();
      clearWorkdayState({ showInactiveBanner: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isWorkdayInactiveMessage(message)) {
        clearWorkdayState({ showInactiveBanner: true });
        return;
      }
      setError(TRACKING_SYNC_ERROR);
    } finally {
      setBusy(false);
    }
  }, [clearWorkdayState, flushPendingLocationQueue, stopAllTrackingLoops]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cached = await readCachedActiveWorkday();
      if (cancelled || !cached || cached.status !== "working") {
        return;
      }

      workdayRestoreLog("app_start_restore_local_workday", `workday_id=${cached.workday_id}`);
      workdayRestoreLog("using_cached_workday");

      const resolved = resolveWorkdayStartedAt({ started_at: cached.started_at });
      if (!resolved) {
        workdayRestoreLog("workday_timer_started", "invalid_cached_started_at");
        return;
      }

      if (isWorkdayActive(workdayRef.current)) {
        return;
      }

      setCachedDistanceKm(cached.last_known_distance);
      setCachedRoutePoints(cached.last_known_points);
      setUsingCachedWorkday(true);
      setWorkdaySyncStatus("cached");
      setStartedAt(resolved);
      setWorkday({
        workday_id: cached.workday_id,
        is_active: true,
        started_at: resolved,
        start_time: resolved
      });
      workdayRestoreLog("workday_timer_started", resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (workdayApiReady) {
      runSafe(syncWorkdayFromServer({ showExpiredAlert: true }));
      return;
    }

    if (!isAuthenticated) {
      teardownTracking();
      expiredAlertShownRef.current = false;
    }
  }, [isAuthenticated, syncWorkdayFromServer, teardownTracking, workdayApiReady]);

  useEffect(() => {
    if (!workdayApiReady) {
      return;
    }
    const onAppState = (state: AppStateStatus) => {
      if (state === "active") {
        runSafe(flushPendingLocationQueue());
        runSafe(syncWorkdayFromServer({ showExpiredAlert: true }));
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [flushPendingLocationQueue, syncWorkdayFromServer, workdayApiReady]);

  useEffect(() => {
    if (!isWorkdayActive(workday)) {
      stopAllTrackingLoops();
      return;
    }
    startElapsedLoop();
    startGpsTrackingService({
      isGpsEnabled: () => gpsState !== "denied"
    });
    void resumeActiveWorkdayTracking();
    return stopAllTrackingLoops;
  }, [gpsState, resumeActiveWorkdayTracking, startElapsedLoop, stopAllTrackingLoops, workday]);

  useEffect(() => {
    if (!trackingReady || !isWorkdayActive(workday)) {
      return;
    }
    return subscribeConnectivity((online) => {
      if (online) {
        runSafe(flushPendingLocationQueue());
      }
    });
  }, [flushPendingLocationQueue, trackingReady, workday]);

  useEffect(() => {
    if (isWorkdayActive(workday)) {
      runSafe(enforceMaxWorkdayDuration());
    }
  }, [enforceMaxWorkdayDuration, workday]);

  const nextSyncAt = useMemo(
    () => computeNextSyncIso({ startedAt, lastSyncTime, intervalMs: TRACKING_INTERVAL_MS, isActive: isWorkdayActive(workday) }),
    [lastSyncTime, startedAt, workday]
  );

  const value = useMemo(
    () => ({
      busy,
      currentLocation,
      elapsedDuration: formatElapsedDuration(startedAt, elapsedNow),
      error,
      gpsState,
      isActive: isWorkdayActive(workday),
      fieldLocationBlocked: isWorkdayActive(workday) && gpsState === "denied",
      lastSyncTime,
      nextSyncAt,
      pendingSyncCount,
      syncIntervalMinutes: FIELD_TRACKING_INTERVAL_MINUTES,
      loading,
      refreshTracking,
      retryForegroundSync: syncForegroundLocation,
      startDay,
      endDay,
      requireActiveWorkday,
      startedAt,
      workday,
      trackingReady,
      workdayInactiveBanner,
      workdaySyncStatus,
      usingCachedWorkday,
      cachedDistanceKm,
      cachedRoutePoints
    }),
    [
      busy,
      currentLocation,
      elapsedNow,
      error,
      gpsState,
      lastSyncTime,
      loading,
      nextSyncAt,
      pendingSyncCount,
      refreshTracking,
      requireActiveWorkday,
      syncForegroundLocation,
      startDay,
      endDay,
      startedAt,
      trackingReady,
      workday,
      workdayInactiveBanner,
      workdaySyncStatus,
      usingCachedWorkday,
      cachedDistanceKm,
      cachedRoutePoints
    ]
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

function formatElapsedDuration(startedAt: string | null, now: number) {
  const started = getWorkdayStartTimestamp(startedAt);
  if (!started) {
    return "Not started";
  }

  const elapsedMs = Math.max(0, now - started);
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function computeNextSyncIso({
  startedAt,
  lastSyncTime,
  intervalMs,
  isActive
}: {
  startedAt: string | null;
  lastSyncTime: string | null;
  intervalMs: number;
  isActive: boolean;
}) {
  if (!isActive) {
    return null;
  }
  const anchor = lastSyncTime || startedAt;
  if (!anchor) {
    return null;
  }
  const base = new Date(anchor).getTime();
  if (Number.isNaN(base)) {
    return null;
  }
  return new Date(base + intervalMs).toISOString();
}

export function useTracking() {
  const value = useContext(TrackingContext);
  if (!value) {
    throw new Error("useTracking must be used inside TrackingProvider");
  }
  return value;
}
