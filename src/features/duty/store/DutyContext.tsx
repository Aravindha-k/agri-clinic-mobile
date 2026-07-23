import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import {
  fetchCurrentDuty,
  fetchCurrentWorkday,
  startDutySession,
  type WorkdayStatus
} from "../../../api/tracking";
import { ApiRequestError, isNetworkError } from "../../../utils/apiError";
import { setConnectivityOnline } from "../../../utils/connectivityBus";
import { readForegroundLocationIfGranted } from "../../../utils/location";
import { isWorkdayAlreadyActiveMessage } from "../../../utils/workdayStatus";
import { registerSessionTeardown } from "../../../storage/sessionConflict";
import {
  clearCachedActiveWorkday,
  clearObsoleteWorkdayAuthorityKeys,
  saveDutySessionFromWorkday
} from "../../../storage/workdaySessionStorage";
import { useAuth, useAuthSessionReady } from "../../../storage/AuthContext";
import { flushTrackingGpsQueue, startTrackingBridge, stopTrackingBridge } from "../../../storage/TrackingContext";
import { confirmDutyStartLocation } from "../../../tracking/locationSyncService";
import { subscribeAuthPhase, canSendAuthenticatedRequests } from "../../../storage/authPhase";
import { fetchDutyMap, invalidateDutyMapCache } from "../api/dutyMapApi";
import { fetchMobileBootstrap, invalidateMobileBootstrapCache } from "../api/mobileBootstrapApi";
import { toEmployeeDutyMapPresentation } from "../map/employeeDayMapMarkers";
import { writeScopedDayMap } from "../storage/dayMapCacheStorage";
import {
  clearCachedDutyState,
  emptyMapForToday,
  readCachedDutyState,
  toOfflineDutySnapshot,
  writeCachedDutyBootstrap
} from "../storage/dutyCacheStorage";
import type { DutyMapSummary, DutyStateSnapshot, MobileBootstrap } from "../types/duty";
import { subscribeVisitDataRefresh } from "../../../../mobile/lib/visit/visitDataRefresh";
import { STARTUP_TIMEOUTS, markDutyReady } from "../../../bootstrap/startupCoordinator";
import { logStartup } from "../../../utils/startupDiagnostics";
import { trackingDevLog } from "../../../tracking/trackingDevLog";
import {
  getCanonicalWorkDateFromServerNow,
  reconcileDutyForCanonicalDay,
  resolveDutyWorkDate
} from "../../../utils/workdayCalendar";

type BootstrapHydrationInput = {
  bootstrap: MobileBootstrap | null;
  userId: number | null;
  error?: unknown;
};

type DutyContextValue = DutyStateSnapshot & {
  hydrateFromBootstrap: (input: BootstrapHydrationInput) => Promise<void>;
  refreshBootstrap: (options?: { force?: boolean }) => Promise<void>;
  refreshCurrentDuty: () => Promise<WorkdayStatus | null>;
  refreshDutyMap: (options?: { force?: boolean }) => Promise<DutyMapSummary | null>;
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

function mapHasMarkers(map: DutyMapSummary | null | undefined): boolean {
  if (!map) return false;
  return Boolean(map.startMarker || map.endMarker || (map.visitMarkers?.length ?? 0) > 0);
}

function sameSessionMap(map: DutyMapSummary | null | undefined, dutySessionId: number | null | undefined): boolean {
  if (!map || dutySessionId == null) return false;
  return map.dutyId == null || map.dutyId === dutySessionId;
}

async function captureDutyActionLocation(timeoutMs = 12_000) {
  const timeout = new Promise<Awaited<ReturnType<typeof readForegroundLocationIfGranted>>>((resolve) => {
    setTimeout(() => {
      resolve({
        granted: false,
        message: "Unable to get location. Check GPS and try again."
      });
    }, timeoutMs);
  });
  // Check-only — never prompts. Start Workday must have passed Field Tracking readiness first.
  try {
    return await Promise.race([readForegroundLocationIfGranted(), timeout]);
  } catch {
    return {
      granted: false as const,
      message: "Unable to get location. Check GPS and try again."
    };
  }
}

export function DutyProvider({ children }: { children: React.ReactNode }) {
  const sessionReady = useAuthSessionReady();
  const { authPhase } = useAuth();
  const holdDutyCache = authPhase === "authenticated" || authPhase === "validating_session";
  const [state, setState] = useState<DutyStateSnapshot>(() => initialState());
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null);
  const mapPromiseRef = useRef<Promise<DutyMapSummary | null> | null>(null);
  const actionPromiseRef = useRef<Promise<WorkdayStatus | null> | null>(null);
  const currentUserIdRef = useRef<number | null>(null);
  const dutyRef = useRef<WorkdayStatus | null>(null);
  const dutyMapRef = useRef<DutyMapSummary | null>(null);
  const serverOffsetRef = useRef(0);
  dutyRef.current = state.currentDuty;
  dutyMapRef.current = state.dutyMap;
  serverOffsetRef.current = state.serverTimeOffsetMs;

  const applyDutyState = useCallback(
    async (
      duty: WorkdayStatus | null,
      options?: {
        dutyMap?: DutyMapSummary | null;
        /** When true, null dutyMap is an authoritative clear (logout / no duty / new day). */
        authoritativeEmptyMap?: boolean;
        serverTimeOffsetMs?: number;
        serverNow?: string | null;
        offline?: boolean;
        syncStatus?: DutyStateSnapshot["syncStatus"];
        hydrationStatus?: DutyStateSnapshot["hydrationStatus"];
        bootstrapError?: string | null;
        userId?: number | null;
      }
    ) => {
      const userId = options?.userId ?? currentUserIdRef.current;
      const serverTimeOffsetMs =
        typeof options?.serverTimeOffsetMs === "number" ? options.serverTimeOffsetMs : serverOffsetRef.current;
      const canonicalDate = getCanonicalWorkDateFromServerNow(options?.serverNow, serverTimeOffsetMs);
      const reconciled = reconcileDutyForCanonicalDay(duty, canonicalDate);
      const prevMap = dutyMapRef.current;

      let dutyMap: DutyMapSummary | null;
      if (!reconciled) {
        // Authoritative: no today/active duty → clear markers.
        dutyMap = emptyMapForToday();
      } else if (options?.dutyMap != null) {
        dutyMap = toEmployeeDutyMapPresentation(options.dutyMap) ?? emptyMapForToday();
      } else if (options?.dutyMap === null) {
        // Compact bootstrap / pending map fetch — preserve same-session markers.
        if (options.authoritativeEmptyMap) {
          dutyMap = emptyMapForToday();
        } else if (sameSessionMap(prevMap, reconciled.duty_session_id) && mapHasMarkers(prevMap)) {
          dutyMap = toEmployeeDutyMapPresentation(prevMap);
        } else if (reconciled.is_active && mapHasMarkers(prevMap)) {
          dutyMap = toEmployeeDutyMapPresentation(prevMap);
        } else {
          // loading-with-no-data — keep empty until map endpoint returns
          dutyMap = emptyMapForToday();
        }
      } else if (reconciled.duty_session_id != null && sameSessionMap(prevMap, reconciled.duty_session_id)) {
        dutyMap = toEmployeeDutyMapPresentation(prevMap) ?? emptyMapForToday();
      } else if (reconciled.is_active && mapHasMarkers(prevMap)) {
        dutyMap = toEmployeeDutyMapPresentation(prevMap) ?? emptyMapForToday();
      } else {
        dutyMap = emptyMapForToday();
      }

      // Session / date mismatch → never keep yesterday's markers in today's presentation.
      if (
        dutyMap?.dutyId != null &&
        reconciled?.duty_session_id != null &&
        dutyMap.dutyId !== reconciled.duty_session_id
      ) {
        dutyMap = emptyMapForToday();
      }

      if (reconciled?.is_active) {
        await saveDutySessionFromWorkday(reconciled, {
          userId,
          serverTimeAtStart: reconciled.server_time ?? reconciled.started_at ?? null
        });
      } else {
        await clearCachedActiveWorkday(userId).catch(() => undefined);
      }

      if (userId != null && Number.isFinite(userId) && userId > 0) {
        await writeCachedDutyBootstrap(userId, {
          currentDuty: reconciled,
          dutyMap: dutyMap ?? null,
          serverTimeOffsetMs,
          serverNow: options?.serverNow ?? null,
          canonicalDate
        }).catch(() => undefined);
      }

      setState((prev) => ({
        ...prev,
        hydrationStatus: options?.hydrationStatus ?? "ready",
        currentDuty: reconciled,
        dutyMap: dutyMap ?? null,
        serverTimeOffsetMs,
        isOffline: options?.offline ?? false,
        lastSyncedAt: options?.offline ? prev.lastSyncedAt : new Date().toISOString(),
        syncStatus: options?.syncStatus ?? "confirmed",
        bootstrapError: options?.bootstrapError ?? null
      }));
    },
    []
  );

  const clearDutyState = useCallback(async (options?: { userId?: number | null; preserveCache?: boolean }) => {
    await stopTrackingBridge().catch(() => undefined);
    const userId = options?.userId ?? currentUserIdRef.current;
    currentUserIdRef.current = options?.userId ?? currentUserIdRef.current;
    dutyRef.current = null;
    dutyMapRef.current = null;
    invalidateMobileBootstrapCache();
    invalidateDutyMapCache();
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
        // Omit null compact map so applyDutyState preserves existing markers while map loads.
        await applyDutyState(bootstrap.currentDuty, {
          ...(bootstrap.dutyMap != null
            ? { dutyMap: bootstrap.dutyMap }
            : bootstrap.currentDuty
              ? { dutyMap: null }
              : { dutyMap: null, authoritativeEmptyMap: true }),
          serverTimeOffsetMs: bootstrap.serverTimeOffsetMs,
          serverNow: bootstrap.serverNow,
          hydrationStatus: "ready",
          syncStatus: bootstrap.dutyMap != null ? "confirmed" : "syncing",
          bootstrapError: null,
          userId
        });
        if (bootstrap.currentDuty?.is_active) {
          await startTrackingBridge().catch(() => undefined);
        } else {
          await stopTrackingBridge().catch(() => undefined);
        }
        if (bootstrap.currentDuty?.duty_session_id && !mapHasMarkers(bootstrap.dutyMap)) {
          try {
            const dutyMap = await fetchDutyMap(bootstrap.currentDuty.duty_session_id);
            await applyDutyState(bootstrap.currentDuty, {
              dutyMap,
              serverTimeOffsetMs: bootstrap.serverTimeOffsetMs,
              serverNow: bootstrap.serverNow,
              hydrationStatus: "ready",
              syncStatus: "confirmed",
              userId
            });
          } catch {
            // Map is best-effort after duty hydrate — keep prior markers.
            setState((prev) => ({
              ...prev,
              syncStatus: prev.dutyMap && mapHasMarkers(prev.dutyMap) ? "confirmed" : prev.syncStatus
            }));
          }
        }
        return;
      }

      const offline = isNetworkError(error);
      if (offline) {
        setConnectivityOnline(false);
        const cached = await readCachedDutyState(userId);
        if (cached) {
          const snapshot = toOfflineDutySnapshot(cached);
          setState(snapshot);
          if (snapshot.currentDuty?.is_active) {
            await startTrackingBridge().catch(() => undefined);
          }
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

  const refreshBootstrap = useCallback(
    async (options?: { force?: boolean }) => {
      if (!canSendAuthenticatedRequests()) {
        return;
      }
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
        // refreshing-with-existing-data: never drop hydration to loading if already ready
        hydrationStatus: prev.hydrationStatus === "ready" ? "ready" : "loading",
        syncStatus: "syncing",
        bootstrapError: null
      }));

      try {
        const bootstrap = await fetchMobileBootstrap({ force: options?.force === true });
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
    },
    [hydrateFromBootstrap]
  );
  const refreshCurrentDuty = useCallback(async () => {
    setState((prev) => ({ ...prev, syncStatus: "syncing", bootstrapError: null }));
    const result = await fetchCurrentDuty();
    if (result.kind === "active" || result.kind === "completed") {
      const canonicalDate = getCanonicalWorkDateFromServerNow(
        result.workday.server_time,
        serverOffsetRef.current
      );
      const reconciled = reconcileDutyForCanonicalDay(result.workday, canonicalDate);
      if (!reconciled) {
        await applyDutyState(null, {
          dutyMap: null,
          authoritativeEmptyMap: true,
          serverNow: result.workday.server_time,
          hydrationStatus: "ready",
          syncStatus: "confirmed",
          offline: false
        });
        await stopTrackingBridge().catch(() => undefined);
        return null;
      }
      // Do not pass dutyMap — preserve existing markers while refreshing duty metadata.
      await applyDutyState(reconciled, {
        serverNow: reconciled.server_time,
        hydrationStatus: "ready",
        syncStatus: "confirmed",
        offline: false
      });
      if (reconciled.is_active) {
        await startTrackingBridge().catch(() => undefined);
      } else {
        await stopTrackingBridge().catch(() => undefined);
      }
      return reconciled;
    }
    await applyDutyState(null, {
      dutyMap: null,
      authoritativeEmptyMap: true,
      hydrationStatus: "ready",
      syncStatus: "confirmed",
      offline: false
    });
    await stopTrackingBridge().catch(() => undefined);
    return null;
  }, [applyDutyState]);

  const refreshDutyMap = useCallback(async (options?: { force?: boolean }) => {
    if (mapPromiseRef.current) {
      return mapPromiseRef.current;
    }

    const run = (async (): Promise<DutyMapSummary | null> => {
      try {
        // refreshing-with-existing-data — keep markers; only mark syncing.
        setState((prev) => ({ ...prev, syncStatus: "syncing" }));
        const duty = dutyRef.current;
        if (!duty?.duty_session_id) {
          const empty = emptyMapForToday();
          setState((prev) => ({
            ...prev,
            dutyMap: empty,
            syncStatus: "confirmed",
            bootstrapError: null
          }));
          if (currentUserIdRef.current != null) {
            await writeCachedDutyBootstrap(currentUserIdRef.current, {
              currentDuty: null,
              dutyMap: empty,
              serverTimeOffsetMs: serverOffsetRef.current,
              serverNow: null
            }).catch(() => undefined);
          }
          return empty;
        }

        const dutyMap = toEmployeeDutyMapPresentation(
          await fetchDutyMap(duty.duty_session_id, { force: options?.force === true })
        );
        // Ignore stale responses if duty changed while the request was in flight.
        if (dutyRef.current?.duty_session_id !== duty.duty_session_id) {
          return null;
        }
        const presented = dutyMap ?? emptyMapForToday();
        setState((prev) => ({
          ...prev,
          dutyMap: presented,
          isOffline: false,
          lastSyncedAt: new Date().toISOString(),
          syncStatus: "confirmed",
          bootstrapError: null
        }));
        if (currentUserIdRef.current != null) {
          const businessDate =
            resolveDutyWorkDate(duty) ??
            getCanonicalWorkDateFromServerNow(duty.server_time ?? null, serverOffsetRef.current);
          await writeScopedDayMap({
            userId: currentUserIdRef.current,
            businessDate,
            dutySessionId: duty.duty_session_id,
            dutyMap: presented
          }).catch(() => undefined);
          await writeCachedDutyBootstrap(currentUserIdRef.current, {
            currentDuty: dutyRef.current,
            dutyMap: presented,
            serverTimeOffsetMs: serverOffsetRef.current,
            serverNow: dutyRef.current?.server_time ?? null,
            canonicalDate: businessDate
          }).catch(() => undefined);
        }
        return presented;
      } catch (error) {
        const offline = isNetworkError(error);
        if (!dutyRef.current?.duty_session_id) {
          const empty = emptyMapForToday();
          setState((prev) => ({
            ...prev,
            dutyMap: empty,
            isOffline: offline,
            syncStatus: offline ? "offline" : "confirmed",
            bootstrapError: null
          }));
          return empty;
        }
        setState((prev) => ({
          ...prev,
          isOffline: offline,
          syncStatus: offline ? "offline" : "error",
          bootstrapError: error instanceof Error ? error.message : "Unable to load duty map."
        }));
        return dutyMapRef.current;
      } finally {
        mapPromiseRef.current = null;
      }
    })();

    mapPromiseRef.current = run;
    return run;
  }, []);
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
      try {
        // Callers (Today / FAB) own the interactive location gate. Here we only
        // silently verify OS readiness — never request permission, never Alert/Settings.
        const { ensureLocationReadyForAction } = await import("../../fieldTrackingSetup");
        const ready = await ensureLocationReadyForAction({ probeOnly: true });
        if (ready.status !== "ready") {
          setState((prev) => ({
            ...prev,
            syncStatus: "idle",
            bootstrapError: ready.message || null
          }));
          return null;
        }

        const locationResult = await captureDutyActionLocation();
        if (!locationResult.granted) {
          setState((prev) => ({
            ...prev,
            syncStatus: "idle",
            bootstrapError: locationResult.message
          }));
          // Duty may already exist on retry — do not re-run Start Work Day UI gate.
          return null;
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
            // Immediate confirmation via location/update — do not wait for poll interval.
            // Queues GPS only if offline; never retries duty/start.
            await confirmDutyStartLocation(locationResult.location, started).catch(() => undefined);
            await startTrackingBridge().catch(() => undefined);
            await refreshDutyMap({ force: true }).catch(() => undefined);
            return started;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!(error instanceof ApiRequestError) && !isWorkdayAlreadyActiveMessage(message)) {
            setState((prev) => ({
              ...prev,
              syncStatus: "idle",
              bootstrapError: message
            }));
            return null;
          }
        }
        return refreshCurrentDuty();
      } catch {
        setState((prev) => ({ ...prev, syncStatus: "idle" }));
        return null;
      }
    });
  }, [applyDutyState, refreshCurrentDuty, refreshDutyMap, runSingleFlightAction]);

  const endDuty = useCallback(async () => {
    throw new ApiRequestError(
      "Employees cannot end the workday manually. It ends automatically after 9 hours or by an administrator.",
      { status: 403, code: "EMPLOYEE_END_FORBIDDEN" }
    );
  }, []);

  useEffect(() => {
    // Do not clear while validating — hydrateDutyFromBootstrap is in flight.
    if (!holdDutyCache) {
      void clearDutyState({ preserveCache: true });
    }
  }, [clearDutyState, holdDutyCache]);

  useEffect(() => {
    return subscribeAuthPhase((phase, previous) => {
      if (phase === "locked" || phase === "unauthenticated" || phase === "session_replaced") {
        void import("../../fieldTrackingSetup").then(({ clearPendingStartWorkDay }) => {
          clearPendingStartWorkDay();
        });
        void stopTrackingBridge().catch(() => undefined);
        return;
      }
      if (phase === "authenticated" && previous !== "authenticated") {
        trackingDevLog("resumed_after_auth");
        if (canSendAuthenticatedRequests() && dutyRef.current?.is_active) {
          void startTrackingBridge().catch(() => undefined);
          void flushTrackingGpsQueue().catch(() => undefined);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (state.hydrationStatus === "ready" || state.hydrationStatus === "error") {
      markDutyReady(state.hydrationStatus);
      return;
    }
    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.hydrationStatus === "ready" || prev.hydrationStatus === "error") return prev;
        logStartup("duty_hydration_timeout", "forcing ready with offline-safe duty state");
        markDutyReady("timeout_offline_fallback");
        return {
          ...prev,
          hydrationStatus: "ready",
          isOffline: true,
          syncStatus: "offline",
          bootstrapError: prev.bootstrapError ?? "Duty hydration timed out — continuing offline."
        };
      });
    }, STARTUP_TIMEOUTS.dutyHydrationMs);
    return () => clearTimeout(timer);
  }, [sessionReady, state.hydrationStatus]);

  useEffect(() => {
    if (!sessionReady) return;
    return NetInfo.addEventListener((next) => {
      const online = Boolean(next.isConnected && next.isInternetReachable !== false);
      setState((prev) => {
        if (prev.isOffline === !online) return prev;
        return { ...prev, isOffline: !online };
      });
      if (online) {
        // Forced reconcile after reconnect — single bootstrap pipeline hydrates duty + map.
        void refreshBootstrap({ force: true })
          .then(() => flushTrackingGpsQueue().catch(() => undefined));
      }
    });
  }, [refreshBootstrap, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        // Freshness-aware bootstrap only — avoids Auth+Duty+map triple storm.
        void refreshBootstrap({ force: false }).catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [refreshBootstrap, sessionReady]);

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

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeVisitDataRefresh(() => {
      if (cancelled) return;
      void refreshDutyMap({ force: true }).catch(() => undefined);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshDutyMap]);

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
