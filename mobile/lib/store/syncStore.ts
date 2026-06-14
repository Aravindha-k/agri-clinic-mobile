import { create } from "zustand";

type SyncStoreState = {
  pendingVisitsCount: number;
  pendingGPSCount: number;
  failedVisitsCount: number;
  unreadNotifCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  setPending: (visits: number, gps: number, failed: number) => void;
  setUnreadNotifCount: (count: number) => void;
  setLastSynced: (time: string) => void;
  setSyncing: (value: boolean) => void;
};

export const useSyncStore = create<SyncStoreState>((set) => ({
  pendingVisitsCount: 0,
  pendingGPSCount: 0,
  failedVisitsCount: 0,
  unreadNotifCount: 0,
  lastSyncedAt: null,
  isSyncing: false,
  setPending: (visits, gps, failed) =>
    set({
      pendingVisitsCount: visits,
      pendingGPSCount: gps,
      failedVisitsCount: failed
    }),
  setUnreadNotifCount: (count) => set({ unreadNotifCount: Math.max(0, count) }),
  setLastSynced: (time) => set({ lastSyncedAt: time }),
  setSyncing: (value) => set({ isSyncing: value })
}));
