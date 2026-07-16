import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import {
  endDutySession,
  fetchCurrentDuty,
  fetchCurrentWorkday,
  startDutySession,
  type WorkdayStatus
} from "../../../api/tracking";
import { ApiRequestError, isNetworkError } from "../../../utils/apiError";
import { setConnectivityOnline } from "../../../utils/connectivityBus";
import { getForegroundLocation } from "../../../utils/location";
import { isWorkdayAlreadyActiveMessage } from "../../../utils/workdayStatus";
import { registerSessionTeardown } from "../../../storage/sessionConflict";
import {
  clearCachedActiveWorkday,
  clearObsoleteWorkdayAuthorityKeys,
  saveDutySessionFromWorkday
} from "../../../storage/workdaySessionStorage";
import { useAuthSessionReady } from "../../../storage/AuthContext";
import { flushTrackingGpsQueue, startTrackingBridge, stopTrackingBridge } from "../../../storage/TrackingContext";
import { fetchCurrentDutyMap, fetchDutyMap } from "../api/dutyMapApi";
import { fetchMobileBootstrap } from "../api/mobileBootstrapApi";
import {
  clearCachedDutyState,
  readCachedDutyState,
  toOfflineDutySnapshot,
  writeCachedDutyBootstrap
} from "../storage/dutyCacheStorage";
import type { DutyMapSummary, DutyStateSnapshot, MobileBootstrap } from "../types/duty";

type BootstrapHydrationInput = {
  bootstrap: MobileBootstrap | null;
  userId: number | null;
  error?: unknown;
};

type DutyContextValue = DutyStateSnapshot & {
  hydrateFromBootstrap: (input: BootstrapHydrationInput) => Promise<void>;
  refreshBootstrap: (options?: { force?: boolean }) => Promise<void>;
  refreshCurrentDuty: () => Promise<WorkdayStatus | null>;
  refreshDutyMap: () => Promise<DutyMapSummary | null>;
  startDuty: () => Promise<WorkdayStatus | null>;
  endDuty: () => Promise<WorkdayStatus | null>;
  clearDutyState: (options?: { userId?: number | null; preserveCache?: boolean }) => Promise<void>;
};

type DutyBootstrapBridge = {
  hydrate: (input: BootstrapHydrationInput) => Promise<void>;
  clear: (options?: { userId?: number | null; preserveCache?: boolean }) => Promise<void>;
};

const DutyContext = createContext<DutyContextValue | undefined>(undefined);

let dutyBootstrapBridge: DutyBootstrapBridge | null = null;

export function hydrateDutyFromBootstrap(input: BootstrapHydrationInput) {
  return dutyBootstrapBridge?.hydrate(input) ?? Promise.resolve();
}

export function clearDutyBootstrapState(options?: { userId?: number | null; preserveCache?: boolean }) {
  return dutyBootstrapBridge?.clear(options) ?? Promise.resolve();
}

function initialState(): DutyStateSnapshot {
  return {
    hydrationStatus: "idle",
    currentDuty: null,
    dutyMap: null,
    serverTimeOffsetMs: 0,
    isOffline: false,
    lastSyncedAt: null,
    syncStatus: "idle",
    bootstrapError: null
  };
}

async function captureDutyActionLocation(timeoutMs = 12_000) {
  const timeout = new Promise<Awaited<ReturnType<typeof getForegroundLocation>>>((resolve) => {
    setTimeout(() => {
      resolve({
        granted: false,
        message: "Unable to get location. Check GPS and try again."
      });
    }, timeoutMs);
  });
  return Promise.race([getForegroundLocation(), timeout]);
}

export function DutyProvider({ children }: { children: React.ReactNode }) {
  const sessionReady = useAuthSessionReady();
  const [state, setState] = useState<DutyStateSnapshot>(() => initialState());
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null);
  const actionPromiseRef = useRef<Promise<WorkdayStatus | null> | null>(null);
  const currentUserIdRef = useRef<number | null>(null);
  const dutyRef = useRef<WorkdayStatus | null>(null);
  dutyRef.current = state.currentDuty;

  const applyDutyState = useCallback(
    async (
      duty: WorkdayStatus | null,
      options?: {
        dutyMap?: DutyMapSummary | null;
        serverTimeOffsetMs?: number;
        offline?: boolean;
        syncStatus?: DutyStateSnapshot["syncStatus"];
        hydrationStatus?: DutyStateSnapshot["hydrationStatus"];
        bootstrapError?: string | null;
        userId?: number | null;
      }
    ) => {
      const userId = options?.userId ?? currentUserIdRef.current;
      const dutyMap = options?.dutyMap !== undefined ? options.dutyMap : dutyRef.current ? state.dutyMap : null;
      const serverTimeOffsetMs =
        typeof options?.serverTimeOffsetMs === "number" ? options.serverTimeOffsetMs : state.serverTimeOffsetMs;

      if (duty?.is_active) {
        await saveDutySessionFromWorkday(duty, { userId, serverTimeAtStart: duty.server_time ?? duty.started_at ?? null });
      } else {
        await clearCachedActiveWorkday(userId).catch(() => undefined);
      }

      if (userId != null && Number.isFinite(userId) && userId > 0) {
        await writeCachedDutyBootstrap(userId, {
          currentDuty: duty,
          dutyMap: dutyMap ?? null,
          serverTimeOffsetMs
        }).catch(() => undefined);
      }

      setState((prev) => ({
        ...prev,
        hydrationStatus: options?.hydrationStatus ?? "ready",
        currentDuty: duty,
        dutyMap: dutyMap ?? null,
        serverTimeOffsetMs,
        isOffline: options?.offline ?? false,
        lastSyncedAt: options?.offline ? prev.lastSyncedAt : new Date().toISOString(),
        syncStatus: options?.syncStatus ?? "confirmed",
        bootstrapError: options?.bootstrapError ?? null
      }));
    },
    [state.dutyMap, state.serverTimeOffsetMs]
  );

  const clearDutyState = useCallback(async (options?: { userId?: number | null; preserveCache?: boolean }) => {
    await stopTrackingBridge().catch(() => undefined);
    const userId = options?.userId ?? currentUserIdRef.current;
    currentUserIdRef.current = options?.userId ?? currentUserIdRef.current;
    dutyRef.current = null;
    setState(initialState());
    await clearCachedActiveWorkday(userId).catch(() => undefined);
    if (!options?.preserveCache) {
      await clearCachedDutyState(userId).catch(() => undefined);
    }
  }, []);

  const hydrateFromBootstrap = useCallback(
    async ({ bootstrap, userId, error }: BootstrapHydrationInput) => {
      currentUserIdRef.current = userId;
      if (bootstrap) {
        setConnectivityOnline(true);
        await clearObsoleteWorkdayAuthorityKeys().catch(() => undefined);
        await applyDutyState(bootstrap.currentDuty, {
          dutyMap: bootstrap.dutyMap,
          serverTimeOffsetMs: bootstrap.serverTimeOffsetMs,
          hydrationStatus: "ready",
          syncStatus: "confirmed",
          bootstrapError: null,
          userId
        });
        if (bootstrap.currentDuty?.is_active) {
          await startTrackingBridge().catch(() => undefined);
        } else {
          await stopTrackingBridge().catch(() => undefined);
        }
        return;
      }

      const offline = isNetworkError(error);
      if (offline) {
        setConnectivityOnline(false);
        const cached = await readCachedDutyState(userId);
        if (cached) {
          setState(toOfflineDutySnapshot(cached));
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        hydrationStatus: "error",
        isOffline: offline,
        syncStatus: offline ? "offline" : "error",
        bootstrapError: error instanceof Error ? error.message : "Unable to load duty state."
      }));
    },
    [applyDutyState]
  );

  const refreshBootstrap = useCallback(async () => {
    if (bootstrapPromiseRef.current) {
      await bootstrapPromiseRef.current;
      return;
    }

    let settle!: () => void;
    const active = new Promise<void>((resolve) => {
      settle = resolve;
    });
    bootstrapPromiseRef.current = active;

    setState((prev) => ({
      ...prev,
      hydrationStatus: prev.hydrationStatus === "ready" ? "ready" : "loading",
      syncStatus: "syncing",
      bootstrapError: null
    }));

    try {
      const bootstrap = await fetchMobileBootstrap();
      await hydrateFromBootstrap({
        bootstrap,
        userId: bootstrap.user?.id ?? currentUserIdRef.current ?? null
      });
    } catch (error) {
      await hydrateFromBootstrap({
        bootstrap: null,
        userId: currentUserIdRef.current,
        error
      });
    } finally {
      if (bootstrapPromiseRef.current === active) {
        bootstrapPromiseRef.current = null;
      }
      settle();
    }
  }, [hydrateFromBootstrap]);

  const refreshCurrentDuty = useCallback(async () => {
    setState((prev) => ({ ...prev, syncStatus: "syncing", bootstrapError: null }));
    const result = await fetchCurrentDuty();
    if (result.kind === "active" || result.kind === "completed") {
      await applyDutyState(result.workday, {
        hydrationStatus: "ready",
        syncStatus: "confirmed",
        offline: false
      });
      if (result.workday.is_active) {
        await startTrackingBridge().catch(() => undefined);
      } else {
        await stopTrackingBridge().catch(() => undefined);
      }
      return result.workday;
    }
    await applyDutyState(null, {
      dutyMap: state.dutyMap,
      hydrationStatus: "ready",
      syncStatus: "confirmed",
      offline: false
    });
    await stopTrackingBridge().catch(() => undefined);
    return null;
  }, [applyDutyState, state.dutyMap]);

  const refreshDutyMap = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, syncStatus: "syncing" }));
      const duty = dutyRef.current;
      const dutyMap =
        duty?.duty_session_id != null ? await fetchDutyMap(duty.duty_session_id) : await fetchCurrentDutyMap();
      setState((prev) => ({
        ...prev,
        dutyMap,
        isOffline: false,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: "confirmed",
        bootstrapError: null
      }));
      if (currentUserIdRef.current != null) {
        await writeCachedDutyBootstrap(currentUserIdRef.current, {
          currentDuty: dutyRef.current,
          dutyMap,
          serverTimeOffsetMs: state.serverTimeOffsetMs
        }).catch(() => undefined);
      }
      return dutyMap;
    } catch (error) {
      const offline = isNetworkError(error);
      setState((prev) => ({
        ...prev,
        isOffline: offline,
        syncStatus: offline ? "offline" : "error",
        bootstrapError: error instanceof Error ? error.message : "Unable to load duty map."
      }));
      return null;
    }
  }, [state.serverTimeOffsetMs]);

  const runSingleFlightAction = useCallback(async (run: () => Promise<WorkdayStatus | null>) => {
    if (actionPromiseRef.current) {
      return actionPromiseRef.current;
    }
    actionPromiseRef.current = run().finally(() => {
      actionPromiseRef.current = null;
    });
    return actionPromiseRef.current;
  }, []);

  const startDuty = useCallback(async () => {
    return runSingleFlightAction(async () => {
      setState((prev) => ({ ...prev, syncStatus: "syncing", bootstrapError: null }));
      const locationResult = await captureDutyActionLocation();
      if (!locationResult.granted) {
        throw new Error(locationResult.message);
      }
      const coords = locationResult.location.coords;
      try {
        const started = await startDutySession({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? null
        });
        if (started) {
          await applyDutyState(started, { hydrationStatus: "ready", syncStatus: "confirmed" });
          await startTrackingBridge().catch(() => undefined);
          await refreshDutyMap().catch(() => undefined);
          return started;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!(error instanceof ApiRequestError) && !isWorkdayAlreadyActiveMessage(message)) {
          throw error;
        }
      }
      return refreshCurrentDuty();
    });
  }, [applyDutyState, refreshCurrentDuty, refreshDutyMap, runSingleFlightAction]);

  const endDuty = useCallback(async () => {
    return runSingleFlightAction(async () => {
      setState((prev) => ({ ...prev, syncStatus: "syncing", bootstrapError: null }));
      await endDutySession(dutyRef.current?.duty_session_id ?? null);
      const duty = await refreshCurrentDuty();
      await stopTrackingBridge().catch(() => undefined);
      await flushTrackingGpsQueue().catch(() => undefined);
      await refreshDutyMap().catch(() => undefined);
      return duty;
    });
  }, [refreshCurrentDuty, refreshDutyMap, runSingleFlightAction]);

  useEffect(() => {
    if (!sessionReady) {
      void clearDutyState({ preserveCache: true });
    }
  }, [clearDutyState, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    return NetInfo.addEventListener((next) => {
      const online = Boolean(next.isConnected && next.isInternetReachable !== false);
      setState((prev) => ({ ...prev, isOffline: !online }));
      if (online) {
        void refreshBootstrap().then(() => flushTrackingGpsQueue().catch(() => undefined));
      }
    });
  }, [refreshBootstrap, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshCurrentDuty().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [refreshCurrentDuty, sessionReady]);

  useEffect(() => {
    dutyBootstrapBridge = {
      hydrate: hydrateFromBootstrap,
      clear: clearDutyState
    };
    return () => {
      if (dutyBootstrapBridge?.hydrate === hydrateFromBootstrap) {
        dutyBootstrapBridge = null;
      }
    };
  }, [clearDutyState, hydrateFromBootstrap]);

  useEffect(() => {
    return registerSessionTeardown(async () => {
      await clearDutyState({ preserveCache: false });
    });
  }, [clearDutyState]);

  const value = useMemo(
    () => ({
      ...state,
      hydrateFromBootstrap,
      refreshBootstrap,
      refreshCurrentDuty,
      refreshDutyMap,
      startDuty,
      endDuty,
      clearDutyState
    }),
    [clearDutyState, endDuty, hydrateFromBootstrap, refreshBootstrap, refreshCurrentDuty, refreshDutyMap, startDuty, state]
  );

  return <DutyContext.Provider value={value}>{children}</DutyContext.Provider>;
}

export function useDuty() {
  const value = useContext(DutyContext);
  if (!value) {
    throw new Error("useDuty must be used inside DutyProvider");
  }
  return value;
}
