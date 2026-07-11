import { create } from "zustand";
import type { SyncPhase } from "../sync/syncOrchestrator";

export type SyncHealthState =
  | "synced"
  | "offline_saving"
  | "syncing"
  | "waiting_internet"
  | "auth_required"
  | "attention_required";

type SyncStoreState = {
  pendingVisitsCount: number;
  pendingGPSCount: number;
  pendingPhotosCount: number;
  pendingWorkdayOpsCount: number;
  failedVisitsCount: number;
  unreadNotifCount: number;
  lastSyncedAt: string | null;
  lastAutomaticAttemptAt: string | null;
  nextScheduledRetryAt: string | null;
  syncHealth: SyncHealthState;
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
  setLastAutomaticAttemptAt: (time: string | null) => void;
  setNextScheduledRetryAt: (time: string | null) => void;
  setSyncHealth: (state: SyncHealthState) => void;
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
  lastAutomaticAttemptAt: null,
  nextScheduledRetryAt: null,
  syncHealth: "synced",
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
  setLastSynced: (time) => set({ lastSyncedAt: time, syncHealth: "synced" }),
  setLastAutomaticAttemptAt: (time) => set({ lastAutomaticAttemptAt: time }),
  setNextScheduledRetryAt: (time) => set({ nextScheduledRetryAt: time }),
  setSyncHealth: (syncHealth) => set({ syncHealth }),
  setSyncing: (value) =>
    set((state) => ({
      isSyncing: value,
      syncHealth: value ? "syncing" : state.syncHealth === "syncing" ? "synced" : state.syncHealth
    })),
  setSyncPhase: (phase) => set({ syncPhase: phase }),
  setGlobalStripVisible: (value) => set({ globalStripVisible: value })
}));
