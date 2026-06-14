import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Farmer } from "../api/farmers";
import { MasterOption } from "../api/masters";
import { ProblemCategory } from "../api/problems";
import { useAuthSessionReady } from "./AuthContext";
import {
  formatMasterSyncWarning,
  isMasterCacheFresh,
  isMasterSyncNetworkFailure,
  readMasterDataCache,
  syncAllFarmersForOffline,
  syncMasterDataFromApi,
  type MasterDataSnapshot
} from "./masterDataCache";

type MasterDataContextValue = {
  districts: MasterOption[];
  villages: MasterOption[];
  crops: MasterOption[];
  problemCategories: ProblemCategory[];
  offlineFarmers: Farmer[];
  lastSyncedAt: string | null;
  farmersSyncedAt: string | null;
  syncing: boolean;
  syncingAllFarmers: boolean;
  offlineWarning: string | null;
  refreshMasterData: (options?: { silent?: boolean; force?: boolean }) => Promise<void>;
  syncAllFarmers: () => Promise<void>;
};

const emptySnapshot: MasterDataSnapshot = {
  syncedAt: "",
  districts: [],
  villages: [],
  crops: [],
  problemCategories: [],
  offlineFarmers: []
};

const MasterDataContext = createContext<MasterDataContextValue | undefined>(undefined);

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
  const sessionReady = useAuthSessionReady();
  const [snapshot, setSnapshot] = useState<MasterDataSnapshot>(emptySnapshot);
  const [syncing, setSyncing] = useState(false);
  const [syncingAllFarmers, setSyncingAllFarmers] = useState(false);
  const [offlineWarning, setOfflineWarning] = useState<string | null>(null);
  const backgroundRefreshStarted = useRef(false);

  const applySnapshot = useCallback((next: MasterDataSnapshot, warning: string | null) => {
    setSnapshot(next);
    setOfflineWarning(warning);
  }, []);

  const loadCache = useCallback(async () => {
    const cached = await readMasterDataCache();
    if (cached) {
      applySnapshot(cached, isMasterCacheFresh(cached.syncedAt) ? null : formatMasterSyncWarning(cached.syncedAt));
    }
  }, [applySnapshot]);

  const refreshMasterData = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      if (!sessionReady) return;
      if (!options?.silent) {
        setSyncing(true);
      }
      try {
        const result = await syncMasterDataFromApi({ force: options?.force });
        if (result.ok) {
          applySnapshot(result.snapshot, null);
          return;
        }
        const warning =
          result.cached != null
            ? formatMasterSyncWarning(result.cached.syncedAt)
            : isMasterSyncNetworkFailure(result.error)
              ? "Master data unavailable offline. Connect to sync directories."
              : "Could not refresh master data. Using last saved copy.";
        if (result.cached) {
          applySnapshot(result.cached, warning);
        } else {
          setOfflineWarning(warning);
        }
      } finally {
        if (!options?.silent) {
          setSyncing(false);
        }
      }
    },
    [applySnapshot, sessionReady]
  );

  const syncAllFarmers = useCallback(async () => {
    if (!sessionReady) return;
    setSyncingAllFarmers(true);
    try {
      const { snapshot: next } = await syncAllFarmersForOffline();
      applySnapshot(next, null);
    } catch {
      setOfflineWarning("Could not sync full farmer directory.");
    } finally {
      setSyncingAllFarmers(false);
    }
  }, [applySnapshot, sessionReady]);

  useEffect(() => {
    if (!sessionReady) {
      setSnapshot(emptySnapshot);
      setOfflineWarning(null);
      backgroundRefreshStarted.current = false;
      return;
    }
    void loadCache().then(() => {
      if (backgroundRefreshStarted.current) return;
      backgroundRefreshStarted.current = true;
      void refreshMasterData({ silent: true });
    });
  }, [sessionReady, loadCache, refreshMasterData]);

  const value = useMemo<MasterDataContextValue>(
    () => ({
      districts: snapshot.districts,
      villages: snapshot.villages,
      crops: snapshot.crops,
      problemCategories: snapshot.problemCategories,
      offlineFarmers: snapshot.offlineFarmers,
      lastSyncedAt: snapshot.syncedAt || null,
      farmersSyncedAt: snapshot.farmersSyncedAt ?? null,
      syncing,
      syncingAllFarmers,
      offlineWarning,
      refreshMasterData,
      syncAllFarmers
    }),
    [snapshot, syncing, syncingAllFarmers, offlineWarning, refreshMasterData, syncAllFarmers]
  );

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

export function useMasterData() {
  const value = useContext(MasterDataContext);
  if (!value) {
    throw new Error("useMasterData must be used inside MasterDataProvider");
  }
  return value;
}
