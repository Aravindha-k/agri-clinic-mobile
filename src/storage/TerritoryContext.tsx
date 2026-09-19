import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { fetchEmployeeTerritory, type TerritoryVillage } from "../api/territory";
import { useAuth, useAuthSessionReady } from "./AuthContext";
import {
  isTerritoryCacheFresh,
  readTerritoryCache,
  writeTerritoryCache
} from "./territoryCache";
import { isAssignedVillageId } from "../utils/villageTerritory";

type TerritoryContextValue = {
  villages: TerritoryVillage[];
  syncedAt: string | null;
  loading: boolean;
  /** True after a successful fetch/cache read with zero villages. */
  isEmpty: boolean;
  /** True when we have no valid village-only cache and cannot load. */
  unavailable: boolean;
  offline: boolean;
  refreshTerritory: (options?: { force?: boolean }) => Promise<void>;
  isAssignedVillage: (villageId: string | number | null | undefined) => boolean;
};

const TerritoryContext = createContext<TerritoryContextValue | undefined>(undefined);

function resetTerritoryState(
  setVillages: (v: TerritoryVillage[]) => void,
  setSyncedAt: (v: string | null) => void,
  setUnavailable: (v: boolean) => void,
  setOffline: (v: boolean) => void
) {
  setVillages([]);
  setSyncedAt(null);
  setUnavailable(false);
  setOffline(false);
}

export function TerritoryProvider({ children }: { children: React.ReactNode }) {
  const sessionReady = useAuthSessionReady();
  const { employee } = useAuth();
  const userId = employee?.id ?? null;
  const [villages, setVillages] = useState<TerritoryVillage[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [offline, setOffline] = useState(false);
  const loadedForUserRef = useRef<number | null>(null);

  const apply = useCallback((next: TerritoryVillage[], at: string | null, fromOffline: boolean) => {
    setVillages(next);
    setSyncedAt(at);
    setUnavailable(false);
    setOffline(fromOffline);
  }, []);

  const refreshTerritory = useCallback(
    async (options?: { force?: boolean }) => {
      if (!sessionReady || userId == null) return;
      setLoading(true);
      try {
        if (!options?.force) {
          const cached = await readTerritoryCache(userId);
          if (cached && isTerritoryCacheFresh(cached.syncedAt)) {
            apply(cached.villages, cached.syncedAt, false);
            return;
          }
        }

        try {
          const rows = await fetchEmployeeTerritory();
          const snapshot = await writeTerritoryCache(userId, rows);
          apply(snapshot.villages, snapshot.syncedAt, false);
        } catch {
          const cached = await readTerritoryCache(userId);
          if (cached) {
            apply(cached.villages, cached.syncedAt, true);
          } else {
            setVillages([]);
            setSyncedAt(null);
            setUnavailable(true);
            setOffline(true);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [apply, sessionReady, userId]
  );

  useEffect(() => {
    if (!sessionReady || userId == null) {
      // Never expose a previous employee's territory while unauthenticated or switching.
      resetTerritoryState(setVillages, setSyncedAt, setUnavailable, setOffline);
      loadedForUserRef.current = null;
      return;
    }

    if (loadedForUserRef.current !== userId) {
      // Clear immediately on employee switch before any cache apply.
      resetTerritoryState(setVillages, setSyncedAt, setUnavailable, setOffline);
      loadedForUserRef.current = userId;
    }

    let cancelled = false;
    void (async () => {
      const cached = await readTerritoryCache(userId);
      if (cancelled || loadedForUserRef.current !== userId) return;
      if (cached) {
        apply(cached.villages, cached.syncedAt, !isTerritoryCacheFresh(cached.syncedAt));
      }
      void refreshTerritory({ force: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [apply, refreshTerritory, sessionReady, userId]);

  const value = useMemo<TerritoryContextValue>(
    () => ({
      villages,
      syncedAt,
      loading,
      isEmpty: !loading && !unavailable && villages.length === 0 && Boolean(syncedAt),
      unavailable,
      offline,
      refreshTerritory,
      isAssignedVillage: (villageId) => isAssignedVillageId(villageId, villages)
    }),
    [loading, offline, refreshTerritory, syncedAt, unavailable, villages]
  );

  return <TerritoryContext.Provider value={value}>{children}</TerritoryContext.Provider>;
}

export function useTerritory() {
  const value = useContext(TerritoryContext);
  if (!value) {
    throw new Error("useTerritory must be used inside TerritoryProvider");
  }
  return value;
}
