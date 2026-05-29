import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { submitMobileVisit } from "../api/visits";
import { uploadAllPendingAttachments } from "../visit/pendingAttachments";
import { uploadPendingFarmerPhotoIfNeeded } from "../visit/uploadPendingFarmerPhoto";
import { isNetworkError } from "../utils/network";
import {
  getQueuedVisits,
  enqueueVisit,
  removeQueuedVisit,
  updateQueuedVisit,
  type QueuedVisit
} from "./offlineVisitQueue";
import { useFieldDataRefresh } from "./FieldDataRefreshContext";

type OfflineSyncContextValue = {
  queue: QueuedVisit[];
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: string | null;
  refreshQueue: () => Promise<void>;
  enqueue: (
    values: import("../api/visits").VisitFormValues,
    pendingAttachments?: import("../visit/pendingAttachments").PendingVisitAttachment[],
    pendingFarmerPhoto?: import("../utils/profileImagePick").PickedProfileImage | null
  ) => Promise<QueuedVisit>;
  syncAll: () => Promise<{ synced: number; failed: number }>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { bumpAfterVisitChange } = useFieldDataRefresh();
  const [queue, setQueue] = useState<QueuedVisit[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const refreshQueue = useCallback(async () => {
    setQueue(await getQueuedVisits());
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  const enqueue = useCallback(
    async (
      values: import("../api/visits").VisitFormValues,
      pendingAttachments: import("../visit/pendingAttachments").PendingVisitAttachment[] = [],
      pendingFarmerPhoto: import("../utils/profileImagePick").PickedProfileImage | null = null
    ) => {
      const item = await enqueueVisit(values, pendingAttachments, pendingFarmerPhoto);
      await refreshQueue();
      return item;
    },
    [refreshQueue]
  );

  const syncAll = useCallback(async () => {
    const items = await getQueuedVisits();
    if (!items.length) {
      return { synced: 0, failed: 0 };
    }
    setSyncing(true);
    let synced = 0;
    let failed = 0;
    for (const item of items) {
      try {
        const visit = await submitMobileVisit(item.values, { localSyncId: item.id });
        if (item.pendingAttachments?.length) {
          await uploadAllPendingAttachments(visit.id, item.pendingAttachments);
        }
        await uploadPendingFarmerPhotoIfNeeded(
          String(visit.farmer?.id ?? item.values.farmer_id),
          item.pendingFarmerPhoto ?? null
        );
        await removeQueuedVisit(item.id);
        synced += 1;
      } catch (err) {
        failed += 1;
        const next: QueuedVisit = {
          ...item,
          attempts: item.attempts + 1,
          lastError: err instanceof Error ? err.message : "Sync failed"
        };
        if (!isNetworkError(err)) {
          await updateQueuedVisit(next);
        } else {
          await updateQueuedVisit(next);
          break;
        }
      }
    }
    if (synced > 0) {
      bumpAfterVisitChange();
    }
    setLastSyncAt(new Date().toISOString());
    await refreshQueue();
    setSyncing(false);
    return { synced, failed };
  }, [bumpAfterVisitChange, refreshQueue]);

  const value = useMemo(
    () => ({
      queue,
      pendingCount: queue.length,
      syncing,
      lastSyncAt,
      refreshQueue,
      enqueue,
      syncAll
    }),
    [queue, syncing, lastSyncAt, refreshQueue, enqueue, syncAll]
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
