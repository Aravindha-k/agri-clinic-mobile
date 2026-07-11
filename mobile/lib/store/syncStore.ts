import { create } from "zustand";
import type { SyncPhase } from "../sync/syncOrchestrator";

type SyncStoreState = {
  pendingVisitsCount: number;
  pendingGPSCount: number;
  pendingPhotosCount: number;
  pendingWorkdayOpsCount: number;
  failedVisitsCount: number;
  unreadNotifCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncPhase: SyncPhase;
  globalStripVisible: boolean;
  setPending: (visits: number, gps: number, failed: number) => void;
  setExtendedPending: (input: {
    visits: number;
    gps: number;
    photos: number;
    workdayOps: number;
    failed: number;
  }) => void;
  setUnreadNotifCount: (count: number) => void;
  setLastSynced: (time: string) => void;
  setSyncing: (value: boolean) => void;
  setSyncPhase: (phase: SyncPhase) => void;
  setGlobalStripVisible: (value: boolean) => void;
};

export const useSyncStore = create<SyncStoreState>((set) => ({
  pendingVisitsCount: 0,
  pendingGPSCount: 0,
  pendingPhotosCount: 0,
  pendingWorkdayOpsCount: 0,
  failedVisitsCount: 0,
  unreadNotifCount: 0,
  lastSyncedAt: null,
  isSyncing: false,
  syncPhase: "idle",
  globalStripVisible: false,
  setPending: (visits, gps, failed) =>
    set({
      pendingVisitsCount: visits,
      pendingGPSCount: gps,
      failedVisitsCount: failed
    }),
  setExtendedPending: ({ visits, gps, photos, workdayOps, failed }) =>
    set({
      pendingVisitsCount: visits,
      pendingGPSCount: gps,
      pendingPhotosCount: photos,
      pendingWorkdayOpsCount: workdayOps,
      failedVisitsCount: failed
    }),
  setUnreadNotifCount: (count) => set({ unreadNotifCount: Math.max(0, count) }),
  setLastSynced: (time) => set({ lastSyncedAt: time }),
  setSyncing: (value) => set({ isSyncing: value }),
  setSyncPhase: (phase) => set({ syncPhase: phase }),
  setGlobalStripVisible: (value) => set({ globalStripVisible: value })
}));
