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
  startWorkday,
  type LocationPushPayload,
  WorkdayStatus
} from "../api/tracking";
import {
  appendLocationPush,
  clearLocationPushQueue,
  readLocationPushQueue
} from "./locationPushQueue";
import { isWorkdayInactiveMessage } from "../utils/workdayStatus";
import { hasValidMapCoords } from "../utils/mapCoords";
import { getForegroundLocation, toTrackingPayload } from "../utils/location";
import { useAuth, useAuthSessionReady } from "./AuthContext";
import { useGpsCompliance } from "./GpsComplianceContext";
import { registerSessionExpiredTeardown } from "./sessionExpired";
import { registerSessionTeardown } from "./sessionConflict";

const TRACKING_INTERVAL_MS = FIELD_TRACKING_INTERVAL_MS;
const MAX_WORKDAY_DURATION_MS = FIELD_MAX_WORKDAY_MS;
const ELAPSED_TICK_MS = 60 * 1000;

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
  startDay: () => Promise<void>;
  endDay: () => Promise<void>;
  /** Returns false and shows alert when no active workday (visits, sync). */
  requireActiveWorkday: () => boolean;
  startedAt: string | null;
  workday: WorkdayStatus | null;
  trackingReady: boolean;
  workdayInactiveBanner: string | null;
};

const TrackingContext = createContext<TrackingContextValue | undefined>(undefined);

function runSafe(promise: Promise<unknown>) {
  void promise.catch(() => undefined);
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const sessionReady = useAuthSessionReady();
  const trackingReady = sessionReady;
  const { ensureWorkAllowed, isWorkBlocked } = useGpsCompliance();
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncInFlightRef = useRef(false);
  const autoEndInFlightRef = useRef(false);
  const expiredAlertShownRef = useRef(false);

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
    setStartedAt(resolveWorkdayStartedAt(status));
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
      applyWorkday(null);
      setCurrentLocation(null);
      setLastSyncTime(null);
      setPendingSyncCount(0);
      void clearLocationPushQueue();
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
    applyWorkday(null);
    setCurrentLocation(null);
    setLastSyncTime(null);
    setPendingSyncCount(0);
    setGpsState("unknown");
    setError("");
    setWorkdayInactiveBanner(null);
    syncInFlightRef.current = false;
    void clearLocationPushQueue();
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

    const startTime = getTimestamp(startedAt);
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
      const result = await fetchCurrentWorkday();
      if (result.kind === "active") {
        expiredAlertShownRef.current = false;
        setWorkdayInactiveBanner(null);
        applyWorkday(result.workday);
        return;
      }
      clearWorkdayState({
        showExpiredAlert: Boolean(options?.showExpiredAlert && result.kind === "expired"),
        showInactiveBanner: result.kind === "expired"
      });
    },
    [applyWorkday, clearWorkdayState]
  );

  const refreshTracking = useCallback(
    async (options?: { showExpiredAlert?: boolean }) => {
      if (!trackingReady) {
        return;
      }

      setLoading(true);
      try {
        setError("");
        await syncWorkdayFromServer(options);
      } catch {
        setError(TRACKING_LOAD_ERROR);
      } finally {
        setLoading(false);
      }
    },
    [syncWorkdayFromServer, trackingReady]
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

  const pushPayload = useCallback(
    async (payload: LocationPushPayload) => {
      try {
        await appendLocationPush(payload);
        const queue = await readLocationPushQueue();
        if (mountedRef.current) {
          setPendingSyncCount(queue.length);
        }
        await syncLocationQueue(queue);
        await clearLocationPushQueue();
        if (mountedRef.current) {
          setPendingSyncCount(0);
          applyLastQueuedLocation(payload);
        }
        await sendHeartbeat(true).catch(() => undefined);
      } catch {
        const queue = await readLocationPushQueue();
        if (mountedRef.current) {
          setPendingSyncCount(queue.length);
        }
        throw new Error(TRACKING_SYNC_ERROR);
      }
    },
    [applyLastQueuedLocation]
  );

  const pushCapturedLocation = useCallback(async (location: Parameters<typeof toTrackingPayload>[0]) => {
    try {
      const payload = toTrackingPayload(location);
      await pushPayload(payload);
    } catch (err) {
      if (err instanceof Error && err.message === TRACKING_SYNC_ERROR) {
        throw err;
      }
      throw new Error("Invalid GPS coordinates");
    }
  }, [pushPayload]);

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

  const startDay = useCallback(async () => {
    if (!ensureWorkAllowed("start your workday")) {
      return;
    }
    setBusy(true);
    try {
      setError("");
      const result = await getForegroundLocation();
      if (!result.granted) {
        setGpsState("denied");
        Alert.alert("Location unavailable", result.message);
        return;
      }

      await startWorkday();
      try {
        await pushCapturedLocation(result.location);
        const refreshed = await fetchCurrentWorkday();
        if (refreshed.kind === "active") {
          expiredAlertShownRef.current = false;
          setWorkdayInactiveBanner(null);
          applyWorkday(refreshed.workday);
        } else {
          clearWorkdayState({ showInactiveBanner: true });
          Alert.alert("Unable to start work", "Could not confirm your workday. Please try again.");
          return;
        }
      } catch {
        setError(TRACKING_SYNC_ERROR);
        Alert.alert("Work started", TRACKING_SYNC_ERROR);
      }
      startForegroundLoop();
      startElapsedLoop();
    } catch {
      setError(TRACKING_SYNC_ERROR);
      Alert.alert("Unable to start work", TRACKING_SYNC_ERROR);
    } finally {
      setBusy(false);
    }
  }, [applyWorkday, clearWorkdayState, ensureWorkAllowed, pushCapturedLocation, startElapsedLoop, startForegroundLoop]);

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
  }, [clearWorkdayState, stopAllTrackingLoops]);

  useEffect(() => {
    if (trackingReady) {
      runSafe(refreshTracking({ showExpiredAlert: true }));
      return;
    }

    if (!isAuthenticated) {
      teardownTracking();
      expiredAlertShownRef.current = false;
    }
  }, [isAuthenticated, refreshTracking, teardownTracking, trackingReady]);

  useEffect(() => {
    if (!trackingReady) {
      return;
    }
    const onAppState = (state: AppStateStatus) => {
      if (state === "active") {
        runSafe(refreshTracking({ showExpiredAlert: true }));
        runSafe(flushPendingLocationQueue());
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [flushPendingLocationQueue, refreshTracking, trackingReady]);

  useEffect(() => {
    if (isWorkdayActive(workday)) {
      startForegroundLoop();
      startElapsedLoop();
      return stopAllTrackingLoops;
    }
    stopAllTrackingLoops();
  }, [startElapsedLoop, startForegroundLoop, stopAllTrackingLoops, workday]);

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
      workdayInactiveBanner
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
      workdayInactiveBanner
    ]
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

function resolveWorkdayStartedAt(status: WorkdayStatus | null) {
  if (!status) {
    return null;
  }

  const raw = status.started_at || status.start_time;
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw).getTime();
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  if (status.date && raw.includes(":")) {
    const combined = `${status.date}T${raw}`;
    const combinedTs = new Date(combined).getTime();
    if (!Number.isNaN(combinedTs)) {
      return new Date(combinedTs).toISOString();
    }
  }

  return raw;
}

function getTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatElapsedDuration(startedAt: string | null, now: number) {
  const started = getTimestamp(startedAt);
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
