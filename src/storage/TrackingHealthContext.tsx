/**
 * Canonical tracking-health owner for active workdays.
 * Single source of truth for GPS/permission/tracking gates.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";
import { sendTrackingHeartbeat } from "../api/tracking";
import {
  TRACKING_HEALTH_COPY,
  TRACKING_HEALTH_PROBE_MS,
  TRACKING_STALE_BLOCK_MS,
  TRACKING_STALE_WARNING_MS
} from "../constants/trackingHealth";
import { useDuty } from "../features/duty/store/DutyContext";
import {
  ensureLocationReadyForAction,
  openSettingsForPendingStartWorkDay
} from "../features/fieldTrackingSetup";
import {
  isTrackingHealthBlocking,
  trackingHealthPrimaryAction,
  type TrackingHealth
} from "../tracking/trackingHealthTypes";
import { readLocationServicesEnabled } from "../utils/locationServicesProbe";
import { subscribeAuthPhase } from "./authPhase";
import { useAuthSessionReady } from "./AuthContext";
import {
  flushTrackingGpsQueue,
  startTrackingBridge,
  useTracking
} from "./TrackingContext";

type TrackingHealthContextValue = {
  health: TrackingHealth;
  isBlocking: boolean;
  lastLocationAt: string | null;
  staleWarning: boolean;
  copy: typeof TRACKING_HEALTH_COPY;
  primaryAction: ReturnType<typeof trackingHealthPrimaryAction>;
  refreshHealth: () => Promise<TrackingHealth>;
  recover: () => Promise<boolean>;
  openSettingsExplicit: () => Promise<void>;
};

const TrackingHealthContext = createContext<TrackingHealthContextValue | undefined>(undefined);

let lastOutageKey: string | null = null;

function outageKey(health: TrackingHealth): string | null {
  if (!isTrackingHealthBlocking(health)) return null;
  return health.status;
}

function healthEquals(a: TrackingHealth, b: TrackingHealth): boolean {
  const aAt = "lastLocationAt" in a ? a.lastLocationAt ?? null : null;
  const bAt = "lastLocationAt" in b ? b.lastLocationAt ?? null : null;
  return a.status === b.status && aAt === bAt;
}

function setHealthIfChanged(
  setHealth: React.Dispatch<React.SetStateAction<TrackingHealth>>,
  next: TrackingHealth
): void {
  setHealth((prev) => (healthEquals(prev, next) ? prev : next));
}

/** Avoid blocking modal while TrackingContext starts after Start Work Day. */
const TRACKING_START_GRACE_MS = 20_000;

async function evaluateHealth(input: {
  workdayActive: boolean;
  foregroundTrackingActive: boolean;
  lastLocationAt: string | null;
  appActive: boolean;
  workdayActiveForMs?: number | null;
}): Promise<TrackingHealth> {
  if (!input.workdayActive) {
    return { status: "idle" };
  }

  try {
    const permission = await Location.getForegroundPermissionsAsync();
    const granted = permission.granted === true || permission.status === "granted";
    if (!granted) {
      const permanent = permission.status === "denied" && permission.canAskAgain === false;
      return permanent
        ? { status: "permission_permanently_denied" }
        : { status: "permission_required" };
    }

    const servicesEnabled = await readLocationServicesEnabled().catch(() => false);
    if (!servicesEnabled) {
      return { status: "services_disabled" };
    }

    if (!input.foregroundTrackingActive) {
      const age = input.workdayActiveForMs;
      if (typeof age === "number" && age >= 0 && age < TRACKING_START_GRACE_MS) {
        // Bridge still starting — do not brick UI with Resume modal.
        return { status: "recovering" };
      }
      return { status: "tracking_stopped" };
    }

    if (!input.lastLocationAt) {
      // Tracking is running; wait for first fix without blocking field work.
      return { status: "recovering" };
    }

    const age = Date.now() - Date.parse(input.lastLocationAt);
    if (Number.isFinite(age) && age >= TRACKING_STALE_BLOCK_MS && input.appActive) {
      return { status: "location_stale", lastLocationAt: input.lastLocationAt };
    }
    return { status: "healthy", lastLocationAt: input.lastLocationAt };
  } catch {
    return { status: "tracking_stopped" };
  }
}

export function TrackingHealthProvider({ children }: { children: React.ReactNode }) {
  const sessionReady = useAuthSessionReady();
  const { currentDuty } = useDuty();
  const { currentLocation, foregroundTrackingActive, refreshTrackingState } = useTracking();
  const workdayActive = Boolean(currentDuty?.is_active);

  const [health, setHealth] = useState<TrackingHealth>({ status: "idle" });
  const [staleWarning, setStaleWarning] = useState(false);
  const [lastLocationAt, setLastLocationAt] = useState<string | null>(null);
  const evaluatingRef = useRef(false);
  const recoverInFlightRef = useRef<Promise<boolean> | null>(null);
  const appActiveRef = useRef(AppState.currentState === "active");
  const lastLocationAtRef = useRef<string | null>(null);
  const lastLocationKeyRef = useRef<string | null>(null);
  const workdayActivatedAtRef = useRef<number | null>(null);
  const healthRef = useRef(health);
  healthRef.current = health;

  const sessionReadyRef = useRef(sessionReady);
  sessionReadyRef.current = sessionReady;
  const workdayActiveRef = useRef(workdayActive);
  workdayActiveRef.current = workdayActive;
  const foregroundTrackingActiveRef = useRef(foregroundTrackingActive);
  foregroundTrackingActiveRef.current = foregroundTrackingActive;

  useEffect(() => {
    if (workdayActive) {
      if (workdayActivatedAtRef.current == null) {
        workdayActivatedAtRef.current = Date.now();
      }
    } else {
      workdayActivatedAtRef.current = null;
    }
  }, [workdayActive]);

  useEffect(() => {
    if (!currentLocation) return;
    const key = `${currentLocation.latitude},${currentLocation.longitude},${currentLocation.accuracy ?? ""}`;
    // Same fix identity — do not invent a new timestamp (avoids probe churn).
    if (key === lastLocationKeyRef.current && lastLocationAtRef.current) return;
    lastLocationKeyRef.current = key;
    const stamp = new Date().toISOString();
    lastLocationAtRef.current = stamp;
    setLastLocationAt(stamp);
  }, [currentLocation]);

  const refreshHealth = useCallback(async (): Promise<TrackingHealth> => {
    if (evaluatingRef.current) {
      return healthRef.current;
    }
    evaluatingRef.current = true;
    try {
      if (!sessionReadyRef.current || !workdayActiveRef.current) {
        const idle: TrackingHealth = { status: "idle" };
        setHealthIfChanged(setHealth, idle);
        setStaleWarning((prev) => (prev ? false : prev));
        lastOutageKey = null;
        return idle;
      }

      const activatedAt = workdayActivatedAtRef.current;
      const next = await evaluateHealth({
        workdayActive: workdayActiveRef.current,
        foregroundTrackingActive: foregroundTrackingActiveRef.current,
        lastLocationAt: lastLocationAtRef.current,
        appActive: appActiveRef.current,
        workdayActiveForMs: activatedAt != null ? Date.now() - activatedAt : null
      });

      let nextWarn = false;
      if (lastLocationAtRef.current) {
        const age = Date.now() - Date.parse(lastLocationAtRef.current);
        nextWarn =
          Number.isFinite(age) &&
          age >= TRACKING_STALE_WARNING_MS &&
          age < TRACKING_STALE_BLOCK_MS &&
          next.status === "healthy";
      }
      setStaleWarning((prev) => (prev === nextWarn ? prev : nextWarn));

      setHealthIfChanged(setHealth, next);
      const key = outageKey(next);
      if (key && key !== lastOutageKey) {
        lastOutageKey = key;
      }
      if (!key) {
        lastOutageKey = null;
      }
      return next;
    } finally {
      evaluatingRef.current = false;
    }
  }, []);

  const recover = useCallback(async (): Promise<boolean> => {
    if (recoverInFlightRef.current) {
      return recoverInFlightRef.current;
    }

    recoverInFlightRef.current = (async () => {
      setHealthIfChanged(setHealth, { status: "recovering" });
      try {
        const readiness = await ensureLocationReadyForAction();
        if (readiness.status !== "ready") {
          const mapped =
            readiness.status === "permission_denied_permanent"
              ? ({ status: "permission_permanently_denied" } as TrackingHealth)
              : readiness.status === "services_disabled" || readiness.status === "cancelled"
                ? ({ status: "services_disabled" } as TrackingHealth)
                : readiness.status === "permission_denied_retryable"
                  ? ({ status: "permission_required" } as TrackingHealth)
                  : ({ status: "tracking_stopped" } as TrackingHealth);
          setHealthIfChanged(setHealth, mapped);
          return false;
        }

        await startTrackingBridge().catch(() => undefined);
        await refreshTrackingState().catch(() => undefined);
        await flushTrackingGpsQueue().catch(() => undefined);

        try {
          await sendTrackingHeartbeat().catch(() => undefined);
        } catch {
          // Heartbeat is best-effort for admin live status.
        }

        const next = await evaluateHealth({
          workdayActive: true,
          foregroundTrackingActive: true,
          lastLocationAt: lastLocationAtRef.current,
          appActive: appActiveRef.current
        });
        // After restart, prefer healthy if permission+services OK even before first fix lands.
        if (next.status === "tracking_stopped" || next.status === "location_stale") {
          const now = new Date().toISOString();
          lastLocationAtRef.current = lastLocationAtRef.current ?? now;
          setHealthIfChanged(setHealth, {
            status: "healthy",
            lastLocationAt: lastLocationAtRef.current
          });
          lastOutageKey = null;
          return true;
        }
        setHealthIfChanged(setHealth, next);
        if (!isTrackingHealthBlocking(next)) {
          lastOutageKey = null;
        }
        return !isTrackingHealthBlocking(next);
      } catch {
        setHealthIfChanged(setHealth, { status: "tracking_stopped" });
        return false;
      } finally {
        recoverInFlightRef.current = null;
      }
    })();

    return recoverInFlightRef.current;
  }, [refreshTrackingState]);

  const openSettingsExplicit = useCallback(async () => {
    await openSettingsForPendingStartWorkDay(async () => {
      await recover();
    });
  }, [recover]);

  const refreshHealthRef = useRef(refreshHealth);
  refreshHealthRef.current = refreshHealth;
  const recoverRef = useRef(recover);
  recoverRef.current = recover;

  // Probe + AppState — stable deps only (refs for callbacks). Prevents remount loops.
  useEffect(() => {
    if (!sessionReady) {
      setHealthIfChanged(setHealth, { status: "idle" });
      return;
    }
    void refreshHealthRef.current();
    const interval = setInterval(() => {
      void refreshHealthRef.current();
    }, TRACKING_HEALTH_PROBE_MS);

    const onAppState = (state: AppStateStatus) => {
      appActiveRef.current = state === "active";
      if (state === "active" && workdayActiveRef.current) {
        void (async () => {
          const next = await refreshHealthRef.current();
          if (isTrackingHealthBlocking(next)) {
            await recoverRef.current();
          }
        })();
      }
    };
    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [sessionReady, workdayActive]);

  useEffect(() => {
    void refreshHealth();
  }, [foregroundTrackingActive, lastLocationAt, refreshHealth, workdayActive]);

  useEffect(() => {
    return subscribeAuthPhase((phase) => {
      if (phase === "locked" || phase === "unauthenticated" || phase === "session_replaced") {
        setHealthIfChanged(setHealth, { status: "idle" });
        setStaleWarning((prev) => (prev ? false : prev));
        lastOutageKey = null;
        lastLocationAtRef.current = null;
        lastLocationKeyRef.current = null;
      }
    });
  }, []);

  // When workday ends, clear blocking immediately.
  useEffect(() => {
    if (!workdayActive) {
      setHealthIfChanged(setHealth, { status: "idle" });
      setStaleWarning((prev) => (prev ? false : prev));
      lastOutageKey = null;
    }
  }, [workdayActive]);

  const value = useMemo<TrackingHealthContextValue>(
    () => ({
      health,
      isBlocking: workdayActive && isTrackingHealthBlocking(health),
      lastLocationAt,
      staleWarning,
      copy: TRACKING_HEALTH_COPY,
      primaryAction: trackingHealthPrimaryAction(health),
      refreshHealth,
      recover,
      openSettingsExplicit
    }),
    [health, lastLocationAt, recover, refreshHealth, openSettingsExplicit, staleWarning, workdayActive]
  );

  return (
    <TrackingHealthContext.Provider value={value}>{children}</TrackingHealthContext.Provider>
  );
}

export function useTrackingHealth() {
  const ctx = useContext(TrackingHealthContext);
  if (!ctx) {
    throw new Error("useTrackingHealth must be used inside TrackingHealthProvider");
  }
  return ctx;
}

/** Optional hook for shells that may mount outside the provider during bootstrap. */
export function useTrackingHealthOptional() {
  return useContext(TrackingHealthContext);
}
