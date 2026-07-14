import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";
import { FIELD_MAX_WORKDAY_MS, FIELD_TRACKING_INTERVAL_MINUTES } from "../constants/fieldTracking";
import {
  WORKDAY_INACTIVE_BANNER_MESSAGE,
  WORKDAY_REQUIRED_MESSAGE
} from "../constants/workdayMessages";
import { TRACKING_LOAD_ERROR, TRACKING_SIGNAL_LOST, TRACKING_SYNC_ERROR } from "../constants/trackingMessages";
import {
  endDutySession,
  fetchCurrentWorkday,
  isWorkdayActive,
  sendTrackingHeartbeat,
  type LocationPushPayload,
  WorkdayStatus
} from "../api/tracking";
import NetInfo from "@react-native-community/netinfo";
import {
  enqueueWorkdayEndOperation,
  markWorkdayOpSynced,
  readActiveUserWorkdayOps
} from "../../mobile/lib/sync/workdayOperationQueue";
import { captureWorkdayEndContext, runOrderedFieldSync } from "../../mobile/lib/sync/syncOrchestrator";
import { getActiveSyncUserId } from "../../mobile/lib/sync/queueOwnership";
import { readLocationPushQueue } from "./locationPushQueue";
import { ApiRequestError, getNetworkMessage, isNetworkError } from "../utils/apiError";
import { isWorkdayInactiveMessage } from "../utils/workdayStatus";
import { hasValidMapCoords } from "../utils/mapCoords";
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking
} from "../tracking/backgroundLocationService";
import {
  flushOfflineLocationQueue,
  handleForcedLocationUpdate,
  handleLocationUpdate,
  resetRouteTrackingState
} from "../tracking/locationSyncService";
import {
  markDutyTrackingSessionActive,
  markForegroundPollActive,
  restoreDutySessionFromStorage,
  setTrackingMotionState
} from "../tracking/trackingSession";
import { trackingDevLog } from "../tracking/trackingDevLog";
import { getForegroundLocation, toTrackingPayload } from "../utils/location";
import { showLocationRequiredModal } from "../utils/locationRequiredModal";
import { subscribeConnectivity } from "../utils/connectivityBus";
import { useAuth, useAuthSessionReady } from "./AuthContext";
import { useEmployee } from "./EmployeeContext";
import { useGpsCompliance } from "./GpsComplianceContext";
import {
  clearCachedActiveWorkday,
  getActiveDutySessionId,
  isCachedWorkdayCompleted,
  isCachedWorkdayInProgress,
  markWorkdayCompletedInCache,
  readCachedActiveWorkday,
  readTodayWorkdayRecord,
  saveCachedActiveWorkday,
  saveDutySessionFromWorkday,
  type WorkdaySessionStatus
} from "./workdaySessionStorage";
import {
  formatWorkDurationMs,
  getLocalWorkDate,
  isSameLocalWorkDate,
  isWorkDateToday
} from "../utils/workdayCalendar";
import {
  computeWorkdayElapsedMs,
  mergeWorkdayStartedAt,
  shouldRestoreWorkdayRecord
} from "../utils/workdayPersistence";
import { registerSessionExpiredTeardown } from "./sessionExpired";
import { registerSessionTeardown } from "./sessionConflict";
import { registerPreSignOut } from "./preSignOut";
import {
  startGpsTrackingService,
  stopGpsTrackingService
} from "../../mobile/lib/gps/trackingService";
import { refreshSyncStoreCounts } from "../../mobile/lib/sync/offlineSyncManager";
import { startWorkday } from "../../mobile/lib/workday";
import { getWorkdayStartTimestamp, resolveWorkdayStartedAt } from "../utils/workdayStartedAt";
import { workdayRestoreLog } from "../utils/workdayRestoreLog";
import { useAppPreferences } from "./AppPreferencesContext";
import {
  getForegroundPollIntervalMs,
  isLocationMoving,
  setTrackingBatterySaverEnabled
} from "../tracking/trackingConfig";
import { getBatteryPercent } from "../../mobile/lib/gps/trackingService";
import type { TrackingErrorSource, TrackingErrorState } from "../types/trackingError";
import { trackingErrorMessage, trackingErrorSource } from "../types/trackingError";

const MAX_WORKDAY_DURATION_MS = FIELD_MAX_WORKDAY_MS;
const WORKDAY_SYNC_MIN_INTERVAL_MS = 30_000;
const ELAPSED_TICK_MS = 1000;
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
  errorSource: TrackingErrorSource | null;
  gpsState: GpsState;
  isActive: boolean;
  workdaySessionStatus: WorkdaySessionStatus;
  workdaySessionHydrated: boolean;
  workdayServerReconciled: boolean;
  timerDisplay: string;
  todayWorkDurationMs: number;
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
  const { employee } = useEmployee();
  const sessionReady = useAuthSessionReady();
  const trackingReady = sessionReady;
  const workdayApiReady = sessionReady;
  const { ensureWorkAllowed, isWorkBlocked, notifyGpsGranted, refreshGpsStatus } = useGpsCompliance();
  const { trackingBatterySaver } = useAppPreferences();
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
  const [trackedError, setTrackedError] = useState<TrackingErrorState>(null);
  const [workdayInactiveBanner, setWorkdayInactiveBanner] = useState<string | null>(null);
  const [workdaySyncStatus, setWorkdaySyncStatus] = useState<WorkdaySyncStatus>("idle");
  const [usingCachedWorkday, setUsingCachedWorkday] = useState(false);
  const [cachedDistanceKm, setCachedDistanceKm] = useState(0);
  const [cachedRoutePoints, setCachedRoutePoints] = useState(0);
  const [workdaySessionStatus, setWorkdaySessionStatus] =
    useState<WorkdaySessionStatus>("not_started");
  const [workdaySessionHydrated, setWorkdaySessionHydrated] = useState(false);
  const [workdayServerReconciled, setWorkdayServerReconciled] = useState(false);
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const [completedDurationMs, setCompletedDurationMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncInFlightRef = useRef(false);
  const workdaySyncInFlightRef = useRef(false);
  const lastWorkdaySyncAtRef = useRef(0);
  const workdaySessionSyncDoneRef = useRef(false);
  const autoEndInFlightRef = useRef(false);
  const lastMotionRef = useRef(false);
  const workdayRef = useRef<WorkdayStatus | null>(null);
  const workdayStartedAtRef = useRef<number | null>(null);
  const currentLocationRef = useRef<CurrentLocation | null>(null);

  workdayRef.current = workday;
  currentLocationRef.current = currentLocation;

  const clearTrackedError = useCallback((source?: TrackingErrorSource) => {
    setTrackedError((prev) => {
      if (!prev) return null;
      if (source && prev.source !== source) return prev;
      return null;
    });
  }, []);

  const setTrackedErrorFor = useCallback((source: TrackingErrorSource, message: string) => {
    setTrackedError({ source, message });
  }, []);

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
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    markForegroundPollActive(false);
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

  const resolveSyncUserId = useCallback(
    () => employee?.id ?? getActiveSyncUserId(),
    [employee?.id]
  );

  const applyWorkday = useCallback((status: WorkdayStatus | null) => {
    workdayRef.current = status;
    setWorkday(status);
    const serverStart = resolveWorkdayStartedAt(status);
    const userId = resolveSyncUserId();

    if (status?.workday_id && serverStart) {
      void readTodayWorkdayRecord(userId).then((existing) => {
        const mergedStart = mergeWorkdayStartedAt(existing?.started_at, serverStart) ?? serverStart;
        setStartedAt(mergedStart);
        void saveCachedActiveWorkday({
          workday_id: status.workday_id,
          duty_session_id: status.duty_session_id ?? status.workday_id,
          started_at: mergedStart,
          work_date: getLocalWorkDate(),
          status: "in_progress",
          last_known_distance: existing?.last_known_distance ?? 0,
          last_known_points: existing?.last_known_points ?? 0,
          user_id: userId ?? existing?.user_id
        });
      });
      setWorkdaySessionStatus("in_progress");
      setCompletedDurationMs(0);
      markDutyTrackingSessionActive(true);
      setUsingCachedWorkday(false);
    } else if (!status) {
      markDutyTrackingSessionActive(false);
      setUsingCachedWorkday(false);
    } else if (serverStart) {
      void readTodayWorkdayRecord(userId).then((existing) => {
        const mergedStart = mergeWorkdayStartedAt(existing?.started_at, serverStart) ?? serverStart;
        setStartedAt(mergedStart);
      });
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
    if (status) {
      setCurrentLocation(null);
      setLastSyncTime(status?.last_heartbeat || null);
    }
  }, [resolveSyncUserId]);

  const clearWorkdayState = useCallback(
    (options?: { showInactiveBanner?: boolean }) => {
      stopAllTrackingLoops();
      markForegroundPollActive(false);
      markDutyTrackingSessionActive(false);
      void stopBackgroundLocationTracking();
      setWorkday(null);
      workdayRef.current = null;
      setStartedAt(null);
      setWorkdaySessionStatus("not_started");
      setCompletedDurationMs(0);
      setCurrentLocation(null);
      setLastSyncTime(null);
      setPendingSyncCount(0);
      void clearCachedActiveWorkday(resolveSyncUserId());
      setCachedDistanceKm(0);
      setCachedRoutePoints(0);
      void resetRouteTrackingState();
      stopGpsTrackingService();
      workdayStartedAtRef.current = null;
      setTrackedError(null);
      setUsingCachedWorkday(false);
      if (options?.showInactiveBanner) {
        setWorkdayInactiveBanner(WORKDAY_INACTIVE_BANNER_MESSAGE);
      }
    },
    [resolveSyncUserId, stopAllTrackingLoops]
  );

  const applyCompletedWorkdayFromCache = useCallback(
    (cached: NonNullable<Awaited<ReturnType<typeof readTodayWorkdayRecord>>>) => {
      stopAllTrackingLoops();
      markForegroundPollActive(false);
      markDutyTrackingSessionActive(false);
      void stopBackgroundLocationTracking();
      stopGpsTrackingService();
      setWorkday(null);
      workdayRef.current = null;
      setStartedAt(cached.started_at);
      setWorkdaySessionStatus("completed");
      setCompletedDurationMs(cached.total_work_duration_ms ?? 0);
      setCachedDistanceKm(cached.last_known_distance);
      setCachedRoutePoints(cached.last_known_points);
      setUsingCachedWorkday(false);
      setWorkdayInactiveBanner(null);
    },
    [stopAllTrackingLoops]
  );

  const restoreInProgressWorkdayFromCache = useCallback(
    (cached: NonNullable<Awaited<ReturnType<typeof readTodayWorkdayRecord>>>) => {
      const resolved = resolveWorkdayStartedAt({ started_at: cached.started_at });
      if (!resolved) {
        workdayRestoreLog("workday_timer_started", "invalid_cached_started_at");
        return;
      }

      setCachedDistanceKm(cached.last_known_distance);
      setCachedRoutePoints(cached.last_known_points);
      setUsingCachedWorkday(true);
      setWorkdaySyncStatus("cached");
      setStartedAt(resolved);
      setWorkdaySessionStatus("in_progress");
      setCompletedDurationMs(0);
      markDutyTrackingSessionActive(true);
      const cachedWorkday = {
        workday_id: cached.workday_id,
        duty_session_id: cached.duty_session_id ?? cached.workday_id,
        is_active: true,
        started_at: resolved,
        start_time: resolved
      };
      workdayRef.current = cachedWorkday;
      setWorkday(cachedWorkday);
      workdayRestoreLog("workday_timer_started", resolved);
    },
    []
  );

  const hydrateWorkdaySessionFromCache = useCallback(async (userId?: number | null) => {
    setWorkdaySessionHydrated(false);
    try {
      const cached = await readCachedActiveWorkday(userId);

      if (!cached) {
        setWorkdaySessionStatus("not_started");
        return;
      }

      if (!isWorkDateToday(cached.work_date)) {
        workdayRestoreLog("cleared_stale_workday", `work_date=${cached.work_date}`);
        if (cached.status === "in_progress") {
          await clearCachedActiveWorkday(userId ?? cached.user_id ?? null);
        }
        setWorkdaySessionStatus("not_started");
        setWorkday(null);
        setStartedAt(null);
        setCompletedDurationMs(0);
        return;
      }

      if (!shouldRestoreWorkdayRecord(cached, userId)) {
        setWorkdaySessionStatus("not_started");
        setWorkday(null);
        setStartedAt(null);
        setCompletedDurationMs(0);
        return;
      }

      if (isCachedWorkdayCompleted(cached)) {
        applyCompletedWorkdayFromCache(cached);
        return;
      }

      if (isCachedWorkdayInProgress(cached)) {
        restoreInProgressWorkdayFromCache(cached);
      }
    } finally {
      setWorkdaySessionHydrated(true);
    }
  }, [applyCompletedWorkdayFromCache, restoreInProgressWorkdayFromCache, resolveSyncUserId]);

  const pauseTrackingForLogout = useCallback(() => {
    stopAllTrackingLoops();
    markForegroundPollActive(false);
    void stopBackgroundLocationTracking();
    stopGpsTrackingService();
  }, [stopAllTrackingLoops]);

  const autoEndWorkday = useCallback(async () => {
    if (autoEndInFlightRef.current) {
      return;
    }

    autoEndInFlightRef.current = true;
    try {
      stopAllTrackingLoops();
      try {
        await endDutySession(await getActiveDutySessionId());
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (!isWorkdayInactiveMessage(message)) {
          throw err;
        }
      }
      clearWorkdayState({ showInactiveBanner: true });
    } catch {
      clearWorkdayState({ showInactiveBanner: true });
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

  const syncWorkdayFromServer = useCallback(async (options?: { force?: boolean }) => {
      if (workdaySyncInFlightRef.current) {
        return;
      }

      const now = Date.now();
      if (
        !options?.force &&
        now - lastWorkdaySyncAtRef.current < WORKDAY_SYNC_MIN_INTERVAL_MS
      ) {
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
          // Offline / API failure — keep local active, never invent Not Started over cache.
          if (isWorkdayActive(workdayRef.current) || workdaySessionStatus === "in_progress") {
            workdayRestoreLog("using_cached_workday");
            setUsingCachedWorkday(true);
            setWorkdaySyncStatus("connecting");
          }
          setWorkdayServerReconciled(true);
          return;
        }

        if (result.kind === "active") {
          const userId = resolveSyncUserId();
          const existingToday = await readTodayWorkdayRecord(userId);
          const serverStart = resolveWorkdayStartedAt(result.workday);
          // Same session: prefer stored local started_at only when same workday IDs.
          const sameSession =
            existingToday != null &&
            existingToday.status === "in_progress" &&
            (existingToday.workday_id === result.workday.workday_id ||
              existingToday.duty_session_id === result.workday.duty_session_id);
          const resolvedStart = sameSession
            ? mergeWorkdayStartedAt(existingToday?.started_at, serverStart)
            : serverStart ?? mergeWorkdayStartedAt(existingToday?.started_at, serverStart);

          if (typeof result.workday.server_time === "string") {
            const serverMs = new Date(result.workday.server_time).getTime();
            if (!Number.isNaN(serverMs)) {
              setServerTimeOffsetMs(serverMs - Date.now());
            }
          }

          if (!resolvedStart || !isSameLocalWorkDate(resolvedStart)) {
            workdayRestoreLog("cleared_stale_workday", "server_active_wrong_day");
            clearWorkdayState({ showInactiveBanner: true });
            setWorkdaySyncStatus("idle");
            setWorkdayServerReconciled(true);
            return;
          }
          setWorkdayInactiveBanner(null);
          workdayStartedAtRef.current = null;
          applyWorkday({
            ...result.workday,
            started_at: resolvedStart,
            start_time: resolvedStart
          });
          setWorkdaySyncStatus("confirmed");
          setWorkdayServerReconciled(true);
          return;
        }

        if (result.kind === "completed") {
          const userId = resolveSyncUserId();
          const endTime =
            result.workday.end_time ||
            new Date().toISOString();
          const start = getWorkdayStartTimestamp(resolveWorkdayStartedAt(result.workday));
          const totalDurationMs =
            result.workday.total_work_duration_ms ??
            (start ? Math.max(0, new Date(endTime).getTime() - start) : 0);
          await markWorkdayCompletedInCache(
            { endWorkTime: endTime, totalDurationMs },
            userId
          );
          const completed = await readTodayWorkdayRecord(userId);
          if (completed) {
            applyCompletedWorkdayFromCache(completed);
          } else {
            applyCompletedWorkdayFromCache({
              workday_id: result.workday.workday_id,
              duty_session_id: result.workday.duty_session_id ?? result.workday.workday_id,
              started_at: resolveWorkdayStartedAt(result.workday) || endTime,
              work_date: getLocalWorkDate(),
              status: "completed",
              end_work_time: endTime,
              total_work_duration_ms: totalDurationMs,
              last_known_distance: 0,
              last_known_points: 0,
              user_id: userId ?? undefined
            });
          }
          setWorkdaySyncStatus("idle");
          setWorkdayServerReconciled(true);
          return;
        }

        // Server authoritative when online: no active duty → clear local in_progress.
        const userId = resolveSyncUserId();
        const todayCached = await readTodayWorkdayRecord(userId);

        if (todayCached && isCachedWorkdayCompleted(todayCached)) {
          applyCompletedWorkdayFromCache(todayCached);
          setWorkdaySyncStatus("idle");
          setWorkdayServerReconciled(true);
          return;
        }

        if (todayCached && isCachedWorkdayInProgress(todayCached)) {
          workdayRestoreLog("cleared_stale_workday", "server_none_over_local");
        }
        clearWorkdayState({
          showInactiveBanner: result.kind === "expired"
        });
        setWorkdaySyncStatus("idle");
        setWorkdayServerReconciled(true);
      } finally {
        workdaySyncInFlightRef.current = false;
        lastWorkdaySyncAtRef.current = Date.now();
        setWorkdayServerReconciled(true);
      }
    },
    [
      applyCompletedWorkdayFromCache,
      applyWorkday,
      clearWorkdayState,
      resolveSyncUserId,
      workdaySessionStatus
    ]
  );

  const refreshTracking = useCallback(async () => {
    if (!workdayApiReady) {
      return;
    }

    try {
      setTrackedError(null);
      await syncWorkdayFromServer({ force: true });
    } catch {
      setTrackedErrorFor("sync", TRACKING_LOAD_ERROR);
      if (isWorkdayActive(workdayRef.current)) {
        setWorkdaySyncStatus("connecting");
      }
    }
  }, [syncWorkdayFromServer, setTrackedErrorFor, workdayApiReady]);

  const applyLastQueuedLocation = useCallback((payload: LocationPushPayload) => {
    if (!mountedRef.current) return;
    setGpsState("granted");
    setCurrentLocation({
      latitude: String(payload.latitude),
      longitude: String(payload.longitude),
      accuracy: payload.accuracy ?? null
    });
    setLastSyncTime(payload.captured_at || payload.recorded_at || null);
    clearTrackedError("tracking");
    clearTrackedError("sync");
  }, [clearTrackedError]);

  const flushPendingLocationQueue = useCallback(async () => {
    if (!isWorkdayActive(workdayRef.current) && !isWorkdayActive(workday)) {
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
      const lastBeforeFlush = queue[queue.length - 1];
      const synced = await flushOfflineLocationQueue();
      const remaining = await readLocationPushQueue();
      if (mountedRef.current) {
        setPendingSyncCount(remaining.length);
        if (synced > 0) {
          applyLastQueuedLocation(lastBeforeFlush);
        }
      }
      refreshSyncStoreCounts();
    } catch {
      const remaining = await readLocationPushQueue();
      if (mountedRef.current) {
        setPendingSyncCount(remaining.length);
      }
      refreshSyncStoreCounts();
    }
  }, [applyLastQueuedLocation, workday]);

  useEffect(() => {
    return registerPreSignOut(() => pauseTrackingForLogout());
  }, [pauseTrackingForLogout]);

  useEffect(() => {
    return registerSessionTeardown(async () => {
      pauseTrackingForLogout();
    });
  }, [pauseTrackingForLogout]);

  useEffect(() => {
    return registerSessionExpiredTeardown(async () => {
      pauseTrackingForLogout();
    });
  }, [pauseTrackingForLogout]);

  const pushCapturedLocation = useCallback(
    async (location: Parameters<typeof toTrackingPayload>[0]) => {
      const moving = isLocationMoving(location.coords.speed);
      lastMotionRef.current = moving;
      setTrackingMotionState(moving);
      try {
        const result = await handleLocationUpdate(location);
        if (result === "skipped") {
          return;
        }
        const batteryLevel = await getBatteryPercent();
        const payload = toTrackingPayload(
          location,
          {
            workdayId: workday?.workday_id,
            dutySessionId: workday?.duty_session_id ?? workday?.workday_id
          },
          batteryLevel
        );
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
        await sendTrackingHeartbeat({ gpsEnabledHint: true }).catch(() => undefined);
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
    [applyLastQueuedLocation, workday?.duty_session_id, workday?.workday_id]
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
        setTrackedErrorFor("sync", TRACKING_SYNC_ERROR);
        return;
      }

      if (!result.granted) {
        const fix = currentLocationRef.current;
        const lat = fix?.latitude != null ? Number(fix.latitude) : NaN;
        const lng = fix?.longitude != null ? Number(fix.longitude) : NaN;
        const hasRecentFix = hasValidMapCoords(lat, lng);
        const gpsOffMessage = result.message?.includes("GPS is turned off");

        if (gpsOffMessage && hasRecentFix) {
          // Transient Android services probe — keep workday usable with last fix.
          return;
        }

        setGpsState("denied");
        await sendTrackingHeartbeat({ gpsEnabledHint: false }).catch(() => undefined);
        setTrackedErrorFor("tracking", TRACKING_SIGNAL_LOST);
        return;
      }

      try {
        await pushCapturedLocation(result.location);
        clearTrackedError("tracking");
        clearTrackedError("sync");
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (isWorkdayInactiveMessage(message)) {
          clearWorkdayState({ showInactiveBanner: /auto-ended|9 hours/i.test(message) });
          return;
        }
        setTrackedErrorFor("sync", TRACKING_SYNC_ERROR);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isWorkdayInactiveMessage(message)) {
        clearWorkdayState({ showInactiveBanner: /auto-ended|9 hours/i.test(message) });
        return;
      }
      setTrackedErrorFor("sync", TRACKING_SYNC_ERROR);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [clearWorkdayState, enforceMaxWorkdayDuration, flushPendingLocationQueue, isWorkBlocked, pushCapturedLocation, setTrackedErrorFor, clearTrackedError, workday]);

  const scheduleForegroundSync = useCallback(() => {
    stopForegroundLoop();
    if (!isWorkdayActive(workdayRef.current)) {
      return;
    }
    const delay = getForegroundPollIntervalMs(lastMotionRef.current);
    intervalRef.current = setTimeout(() => {
      intervalRef.current = null;
      runSafe(
        syncForegroundLocation().finally(() => {
          if (isWorkdayActive(workdayRef.current)) {
            scheduleForegroundSync();
          }
        })
      );
    }, delay);
  }, [stopForegroundLoop, syncForegroundLocation]);

  const startForegroundLoop = useCallback(() => {
    if (intervalRef.current) {
      return;
    }
    markForegroundPollActive(true);
    runSafe(
      syncForegroundLocation().finally(() => {
        if (isWorkdayActive(workdayRef.current)) {
          scheduleForegroundSync();
        } else {
          markForegroundPollActive(false);
        }
      })
    );
  }, [scheduleForegroundSync, syncForegroundLocation]);

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
    await restoreDutySessionFromStorage();
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
      setTrackedError(null);
      setWorkdayServerReconciled(false);
      await syncWorkdayFromServer({ force: true });

      const todayRecord = await readTodayWorkdayRecord(resolveSyncUserId());
      if (todayRecord?.status === "completed") {
        Alert.alert("Workday complete", "Today's workday is already completed.");
        return false;
      }

      if (isWorkdayActive(workdayRef.current)) {
        await syncWorkdayFromServer({ force: true });
        if (!isWorkdayActive(workdayRef.current)) {
          return false;
        }
        markDutyTrackingSessionActive(true);
        await resumeActiveWorkdayTracking();
        startElapsedLoop();
        startGpsTrackingService({
          isGpsEnabled: () => gpsState !== "denied"
        });
        return true;
      }

      const started = await startWorkday({
        ensureWorkAllowed,
        onBackgroundPermissionWarning: (message) => {
          Alert.alert("Background location", message);
        }
      });

      if (!started.ok) {
        if (started.reason === "permissions") {
          setGpsState("denied");
          showLocationRequiredModal();
        } else if (started.reason === "location") {
          setGpsState("denied");
          Alert.alert(
            "GPS signal",
            started.message || "Waiting for a GPS fix. Try again in an open area."
          );
        } else if (started.reason === "api") {
          const message = started.message || TRACKING_SYNC_ERROR;
          setTrackedErrorFor("start_workday", message);
          Alert.alert("Unable to start work", message);
        }
        return false;
      }

      const { workday: activeWorkday, foregroundLocation, background: bg } = started;

      notifyGpsGranted();
      void refreshGpsStatus();

      setWorkdayInactiveBanner(null);
      workdayStartedAtRef.current = Date.now();
      await saveDutySessionFromWorkday(activeWorkday, { userId: getActiveSyncUserId() });
      markDutyTrackingSessionActive(true);
      applyWorkday(activeWorkday);
      setCachedDistanceKm(0);
      setCachedRoutePoints(0);
      setGpsState("granted");
      trackingDevLog(
        "workday_started",
        `duty_session_id=${activeWorkday.duty_session_id ?? activeWorkday.workday_id}`
      );

      const payload = toTrackingPayload(
        foregroundLocation,
        {
          workdayId: activeWorkday.workday_id,
          dutySessionId: activeWorkday.duty_session_id ?? activeWorkday.workday_id
        },
        await getBatteryPercent()
      );
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
      } else if (
        bg.message &&
        !bg.ok &&
        !bg.alreadyRunning &&
        bg.message !== "No active duty session."
      ) {
        Alert.alert("Route tracking", bg.message);
      }
      if (bg.ok || bg.alreadyRunning) {
        stopForegroundLoop();
      } else {
        await resumeActiveWorkdayTracking();
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
      setTrackedErrorFor("start_workday", message);
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
    stopForegroundLoop,
    resumeActiveWorkdayTracking,
    setTrackedErrorFor,
    syncWorkdayFromServer
  ]);

  const requireActiveWorkday = useCallback(() => {
    if (workdaySessionStatus === "in_progress") {
      return true;
    }
    Alert.alert("Workday required", WORKDAY_REQUIRED_MESSAGE);
    return false;
  }, [workdaySessionStatus]);

  const endDay = useCallback(async () => {
    setBusy(true);
    try {
      stopAllTrackingLoops();
      await stopBackgroundLocationTracking();
      try {
        await flushPendingLocationQueue();
      } catch {
        /* retain queued GPS points */
      }

      const endTime = new Date().toISOString();
      const startTime = getWorkdayStartTimestamp(startedAt);
      const totalDurationMs = startTime ? Math.max(0, new Date(endTime).getTime() - startTime) : 0;

      const userId = getActiveSyncUserId();
      const endCtx = await captureWorkdayEndContext();
      if (userId != null) {
        enqueueWorkdayEndOperation({
          user_id: userId,
          device_session_id: endCtx.device_session_id,
          server_workday_id: endCtx.server_workday_id,
          server_duty_session_id: endCtx.server_duty_session_id
        });
      }

      const net = await NetInfo.fetch();
      const online = Boolean(net.isConnected && net.isInternetReachable !== false);
      if (online) {
        try {
          await endDutySession(await getActiveDutySessionId());
          const pendingEnd = readActiveUserWorkdayOps().find((r) => r.operation === "end");
          if (pendingEnd) {
            markWorkdayOpSynced(pendingEnd.local_operation_id);
          }
          void runOrderedFieldSync();
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (isWorkdayInactiveMessage(message)) {
            const pendingEnd = readActiveUserWorkdayOps().find((r) => r.operation === "end");
            if (pendingEnd) {
              markWorkdayOpSynced(pendingEnd.local_operation_id);
            }
          } else {
            throw err;
          }
        }
      }

      await markWorkdayCompletedInCache(
        {
          endWorkTime: endTime,
          totalDurationMs
        },
        resolveSyncUserId()
      );
      const completed = await readTodayWorkdayRecord(resolveSyncUserId());
      if (completed) {
        applyCompletedWorkdayFromCache(completed);
      } else {
        setWorkdaySessionStatus("completed");
        setCompletedDurationMs(totalDurationMs);
        stopAllTrackingLoops();
        markDutyTrackingSessionActive(false);
        void stopBackgroundLocationTracking();
        setWorkday(null);
        stopGpsTrackingService();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isWorkdayInactiveMessage(message)) {
        const endTime = new Date().toISOString();
        const startTime = getWorkdayStartTimestamp(startedAt);
        const totalDurationMs = startTime ? Math.max(0, new Date(endTime).getTime() - startTime) : 0;
        await markWorkdayCompletedInCache(
          { endWorkTime: endTime, totalDurationMs },
          resolveSyncUserId()
        );
        const completed = await readTodayWorkdayRecord(resolveSyncUserId());
        if (completed) {
          applyCompletedWorkdayFromCache(completed);
        }
        return;
      }
      setTrackedErrorFor("end_workday", TRACKING_SYNC_ERROR);
    } finally {
      setBusy(false);
    }
  }, [
    applyCompletedWorkdayFromCache,
    flushPendingLocationQueue,
    setTrackedErrorFor,
    startedAt,
    stopAllTrackingLoops
  ]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (cancelled) return;
      await hydrateWorkdaySessionFromCache(resolveSyncUserId());
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateWorkdaySessionFromCache, resolveSyncUserId]);

  useEffect(() => {
    if (!isAuthenticated || employee?.id == null) {
      return;
    }
    void hydrateWorkdaySessionFromCache(employee.id);
  }, [employee?.id, hydrateWorkdaySessionFromCache, isAuthenticated]);

  useEffect(() => {
    const midnightTimer = setInterval(() => {
      void hydrateWorkdaySessionFromCache(resolveSyncUserId());
    }, 60_000);
    return () => clearInterval(midnightTimer);
  }, [hydrateWorkdaySessionFromCache, resolveSyncUserId]);

  useEffect(() => {
    if (!workdayApiReady) {
      workdaySessionSyncDoneRef.current = false;
      setWorkdayServerReconciled(false);
      if (!isAuthenticated) {
        pauseTrackingForLogout();
      }
      return;
    }

    if (workdaySessionSyncDoneRef.current) {
      return;
    }
    workdaySessionSyncDoneRef.current = true;
    setWorkdayServerReconciled(false);
    runSafe(syncWorkdayFromServer({ force: true }));
  }, [
    employee?.id,
    isAuthenticated,
    pauseTrackingForLogout,
    resolveSyncUserId,
    syncWorkdayFromServer,
    workdayApiReady
  ]);

  useEffect(() => {
    if (!workdayApiReady) {
      return;
    }
    const onAppState = (state: AppStateStatus) => {
      if (state === "active") {
        runSafe(syncWorkdayFromServer().then(() => flushPendingLocationQueue()));
        if (isWorkdayActive(workdayRef.current)) {
          runSafe(resumeActiveWorkdayTracking());
        }
        return;
      }
      if (state === "background" && isWorkdayActive(workdayRef.current)) {
        markDutyTrackingSessionActive(true);
        runSafe(startBackgroundLocationTracking());
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [flushPendingLocationQueue, resumeActiveWorkdayTracking, syncWorkdayFromServer, workdayApiReady]);

  const activeWorkdayId =
    workdayApiReady &&
    workdaySessionStatus === "in_progress" &&
    isWorkdayActive(workday)
      ? workday?.workday_id ?? null
      : null;

  const todayWorkDurationMs = useMemo(
    () =>
      computeWorkdayElapsedMs({
        status: workdaySessionStatus,
        startedAt,
        now: elapsedNow + serverTimeOffsetMs,
        completedDurationMs
      }),
    [completedDurationMs, elapsedNow, serverTimeOffsetMs, startedAt, workdaySessionStatus]
  );

  const timerDisplay = useMemo(
    () => formatWorkDurationMs(todayWorkDurationMs),
    [todayWorkDurationMs]
  );

  useEffect(() => {
    if (!activeWorkdayId) {
      stopAllTrackingLoops();
      return;
    }
    startElapsedLoop();
    startGpsTrackingService({
      isGpsEnabled: () => gpsState !== "denied"
    });
    void resumeActiveWorkdayTracking();
    return stopAllTrackingLoops;
  }, [activeWorkdayId, gpsState, resumeActiveWorkdayTracking, startElapsedLoop, stopAllTrackingLoops]);

  useEffect(() => {
    if (!trackingReady || !activeWorkdayId) {
      return;
    }
    let skipInitialConnectivityPing = true;
    return subscribeConnectivity((online) => {
      if (skipInitialConnectivityPing) {
        skipInitialConnectivityPing = false;
        return;
      }
      if (online) {
        runSafe(syncWorkdayFromServer().then(() => flushPendingLocationQueue()));
      }
    });
  }, [activeWorkdayId, flushPendingLocationQueue, syncWorkdayFromServer, trackingReady]);

  useEffect(() => {
    if (activeWorkdayId) {
      runSafe(enforceMaxWorkdayDuration());
    }
  }, [activeWorkdayId, enforceMaxWorkdayDuration]);

  useEffect(() => {
    setTrackingBatterySaverEnabled(trackingBatterySaver);
    if (!activeWorkdayId) {
      return;
    }
    void (async () => {
      await stopBackgroundLocationTracking();
      await resumeActiveWorkdayTracking();
    })();
  }, [activeWorkdayId, resumeActiveWorkdayTracking, trackingBatterySaver]);

  const nextSyncAt = useMemo(
    () =>
      computeNextSyncIso({
        startedAt,
        lastSyncTime,
        intervalMs: getForegroundPollIntervalMs(lastMotionRef.current),
        isActive: workdaySessionStatus === "in_progress"
      }),
    [lastSyncTime, startedAt, workdaySessionStatus, elapsedNow]
  );

  const value = useMemo(
    () => ({
      busy,
      currentLocation,
      elapsedDuration: formatElapsedDuration(startedAt, elapsedNow),
      error: trackingErrorMessage(trackedError),
      errorSource: trackingErrorSource(trackedError),
      gpsState,
      isActive: workdaySessionStatus === "in_progress",
      workdaySessionStatus,
      workdaySessionHydrated,
      workdayServerReconciled: workdayServerReconciled || !isAuthenticated,
      timerDisplay,
      todayWorkDurationMs,
      fieldLocationBlocked: workdaySessionStatus === "in_progress" && gpsState === "denied",
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
      trackedError,
      gpsState,
      isAuthenticated,
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
      cachedRoutePoints,
      workdaySessionStatus,
      workdaySessionHydrated,
      workdayServerReconciled,
      timerDisplay,
      todayWorkDurationMs
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
