import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { VisitFormValues } from "../api/visits";
import type { PickedProfileImage } from "../utils/profileImagePick";
import type { PendingVisitAttachment } from "../visit/pendingAttachments";
import { useConnectivityOnline } from "../hooks/useConnectivityOnline";
import {
  addToVisitQueue,
  getPendingVisits,
  refreshSyncStoreCounts,
  syncAll as managerSyncAll,
  type PendingVisit
} from "../../mobile/lib/sync/offlineSyncManager";
import { generateLocalSyncId } from "../../mobile/lib/pendingVisitsQueue";
import { useSyncStore } from "../../mobile/lib/store/syncStore";
import { useFieldDataRefresh } from "./FieldDataRefreshContext";

export type QueuedVisit = {
  id: string;
  values: VisitFormValues;
  pendingAttachments?: PendingVisitAttachment[];
  pendingFarmerPhoto?: PickedProfileImage | null;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

function pendingVisitToQueued(row: PendingVisit): QueuedVisit {
  const payload = row.payload as Record<string, unknown>;
  const { __pending_attachments, __pending_farmer_photo, ...values } = payload;
  return {
    id: row.local_sync_id,
    values: values as VisitFormValues,
    pendingAttachments: (__pending_attachments as PendingVisitAttachment[] | undefined) ?? [],
    pendingFarmerPhoto: (__pending_farmer_photo as PickedProfileImage | null | undefined) ?? null,
    createdAt: row.created_at,
    attempts: row.attempts,
    lastError: row.status === "failed" ? "Sync failed" : undefined
  };
}

type OfflineSyncContextValue = {
  queue: QueuedVisit[];
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: string | null;
  lastSyncFailed: number;
  refreshQueue: () => Promise<void>;
  enqueue: (
    values: VisitFormValues,
    pendingAttachments?: PendingVisitAttachment[],
    pendingFarmerPhoto?: PickedProfileImage | null
  ) => Promise<QueuedVisit>;
  syncAll: () => Promise<{ synced: number; failed: number }>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { bumpAfterVisitChange } = useFieldDataRefresh();
  const online = useConnectivityOnline();
  const autoSyncInFlight = useRef(false);
  const [queue, setQueue] = useState<QueuedVisit[]>([]);
  const [lastSyncFailed, setLastSyncFailed] = useState(0);
  const syncing = useSyncStore((state) => state.isSyncing);
  const lastSyncAt = useSyncStore((state) => state.lastSyncedAt);
  const pendingVisitsCount = useSyncStore((state) => state.pendingVisitsCount);
  const failedVisitsCount = useSyncStore((state) => state.failedVisitsCount);

  const refreshQueue = useCallback(async () => {
    refreshSyncStoreCounts();
    const rows = getPendingVisits().filter(
      (row) => row.status === "pending" || row.status === "syncing" || row.status === "failed"
    );
    setQueue(rows.map(pendingVisitToQueued));
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  const enqueue = useCallback(
    async (
      values: VisitFormValues,
      pendingAttachments: PendingVisitAttachment[] = [],
      pendingFarmerPhoto: PickedProfileImage | null = null
    ) => {
      const syncId = values.local_sync_id?.trim() || generateLocalSyncId();
      const payload: Record<string, unknown> = {
        ...values,
        local_sync_id: syncId,
        __pending_attachments: pendingAttachments
      };
      if (pendingFarmerPhoto) {
        payload.__pending_farmer_photo = pendingFarmerPhoto;
      }
      await addToVisitQueue(
        payload,
        values.farmer_name?.trim() || "Farmer",
        values.crop_name?.trim() || "Crop",
        syncId
      );
      await refreshQueue();
      const row = getPendingVisits().find((visit) => visit.local_sync_id === syncId);
      if (!row) {
        throw new Error("Failed to enqueue visit");
      }
      return pendingVisitToQueued(row);
    },
    [refreshQueue]
  );

  const syncAll = useCallback(async () => {
    const result = await managerSyncAll();
    if (result.visits.synced > 0) {
      bumpAfterVisitChange();
    }
    setLastSyncFailed(result.visits.failed);
    await refreshQueue();
    return { synced: result.visits.synced, failed: result.visits.failed };
  }, [bumpAfterVisitChange, refreshQueue]);

  const pendingCount = pendingVisitsCount + failedVisitsCount;

  useEffect(() => {
    if (!online || pendingCount <= 0 || syncing || autoSyncInFlight.current) {
      return;
    }
    autoSyncInFlight.current = true;
    void syncAll().finally(() => {
      autoSyncInFlight.current = false;
    });
  }, [online, pendingCount, syncAll, syncing]);

  const value = useMemo(
    () => ({
      queue,
      pendingCount,
      syncing,
      lastSyncAt,
      lastSyncFailed,
      refreshQueue,
      enqueue,
      syncAll
    }),
    [lastSyncFailed, queue, pendingCount, syncing, lastSyncAt, refreshQueue, enqueue, syncAll]
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error("useOfflineSync must be used inside OfflineSyncProvider");
  }
  return ctx;
}
