/**
 * User-scoped queue for farmer profile photos that failed after farmer create.
 */
import { getJson, setJson } from "../storage";
import type { PickedProfileImage } from "../../../src/utils/profileImagePick";
import {
  filterQueueForActiveUser,
  getActiveSyncUserId,
  quarantineOrphanQueueItems
} from "./queueOwnership";

export const PENDING_FARMER_PHOTO_KEY = "pending_farmer_photo_v1";
const MAX_ATTEMPTS = 8;

export type PendingFarmerPhotoRecord = {
  id: string;
  farmer_id: string;
  photo: PickedProfileImage;
  user_id?: number;
  created_at: string;
  attempts: number;
  last_error?: string;
};

function readAll(): PendingFarmerPhotoRecord[] {
  const rows = getJson<PendingFarmerPhotoRecord[]>(PENDING_FARMER_PHOTO_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

function writeAll(rows: PendingFarmerPhotoRecord[]): void {
  setJson(PENDING_FARMER_PHOTO_KEY, rows);
}

export function readActiveUserPendingFarmerPhotos(): PendingFarmerPhotoRecord[] {
  const all = readAll();
  const userId = getActiveSyncUserId();
  if (userId == null) return [];
  const { owned, orphans } = filterQueueForActiveUser(all, userId);
  if (orphans.length) {
    quarantineOrphanQueueItems("photos", orphans, "farmer_photo_ownership_mismatch");
    const orphanIds = new Set(orphans.map((o) => o.id));
    writeAll(all.filter((row) => !orphanIds.has(row.id)));
  }
  return owned.filter((row) => row.attempts < MAX_ATTEMPTS);
}

export function enqueuePendingFarmerPhoto(params: {
  farmerId: string;
  photo: PickedProfileImage;
  lastError?: string;
}): void {
  const userId = getActiveSyncUserId() ?? undefined;
  const all = readAll();
  const existing = all.findIndex(
    (row) => row.farmer_id === params.farmerId && (userId == null || row.user_id === userId)
  );
  const next: PendingFarmerPhotoRecord = {
    id:
      existing >= 0
        ? all[existing].id
        : `fp-${params.farmerId}-${Date.now()}`,
    farmer_id: params.farmerId,
    photo: params.photo,
    user_id: userId,
    created_at: existing >= 0 ? all[existing].created_at : new Date().toISOString(),
    attempts: existing >= 0 ? all[existing].attempts : 0,
    last_error: params.lastError
  };
  if (existing >= 0) {
    all[existing] = next;
  } else {
    all.push(next);
  }
  writeAll(all);
}

export function clearPendingFarmerPhoto(id: string): void {
  writeAll(readAll().filter((row) => row.id !== id));
}

export function bumpPendingFarmerPhotoAttempt(id: string, lastError?: string): void {
  const all = readAll();
  const idx = all.findIndex((row) => row.id === id);
  if (idx < 0) return;
  all[idx] = {
    ...all[idx],
    attempts: all[idx].attempts + 1,
    last_error: lastError ?? all[idx].last_error
  };
  writeAll(all);
}

export function clearAllPendingFarmerPhotos(): void {
  writeAll([]);
}

export function getPendingFarmerPhotoCount(): number {
  return readActiveUserPendingFarmerPhotos().length;
}
