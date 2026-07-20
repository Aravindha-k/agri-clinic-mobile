import { countActiveUserPendingGps } from "./gpsQueueStore";
import { getPendingEvidenceCount } from "./pendingEvidenceQueue";
import { getPendingFarmerPhotoCount } from "./pendingFarmerPhotoQueue";
import { countPendingWorkdayOps } from "./workdayOperationQueue";
import { getJson, setJson, SYNC_STORAGE_KEYS } from "../storage";
import type { PendingVisit } from "./fieldQueueTypes";
import {
  filterQueueForActiveUser,
  getActiveSyncUserId,
  quarantineOrphanQueueItems
} from "./queueOwnership";

export type FieldPendingCounts = {
  visits: number;
  photos: number;
  gps: number;
  workdayOps: number;
  permanentFailures: number;
  total: number;
};

function readAllVisits(): PendingVisit[] {
  return getJson<PendingVisit[]>(SYNC_STORAGE_KEYS.pendingVisits, []);
}

export function readActiveUserVisits(): PendingVisit[] {
  const all = readAllVisits();
  const userId = getActiveSyncUserId();
  if (userId == null) return [];
  const { owned, orphans } = filterQueueForActiveUser(all, userId);
  if (orphans.length) {
    quarantineOrphanQueueItems("visits", orphans, "ownership_mismatch_or_missing_user");
    const orphanIds = new Set(orphans.map((o) => o.local_sync_id));
    setJson(
      SYNC_STORAGE_KEYS.pendingVisits,
      all.filter((v) => !orphanIds.has(v.local_sync_id))
    );
  }
  return owned;
}

export function getFieldPendingCounts(): FieldPendingCounts {
  const visits = readActiveUserVisits();
  const pendingVisits = visits.filter(
    (v) => v.status === "pending" || v.status === "syncing"
  ).length;
  const permanentFailures = visits.filter((v) => v.status === "failed" || v.status === "quarantined")
    .length;
  const photos = getPendingEvidenceCount() + getPendingFarmerPhotoCount();
  const gps = countActiveUserPendingGps();
  const workdayOps = countPendingWorkdayOps();
  const total = pendingVisits + photos + gps + workdayOps;
  return {
    visits: pendingVisits,
    photos,
    gps,
    workdayOps,
    permanentFailures,
    total
  };
}

export function hasBlockingPendingFieldData(): boolean {
  const counts = getFieldPendingCounts();
  return counts.total > 0;
}
