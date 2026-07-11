import type { VisitFormValues } from "../../src/api/visits";
import type { PendingVisitAttachment } from "../../src/visit/pendingAttachments";
import { persistVisitPhotoAsset, pendingPhotoToVisitAsset } from "./media/persistentVisitPhotos";
import { addToVisitQueue, getPendingVisits, removeVisitFromQueue } from "./sync/offlineSyncManager";
import type { VisitPhotoAsset } from "./visitPhotos";

export const PENDING_VISITS_KEY = "pending_visits_v1";

export type PendingVisitRecord = {
  id: string;
  local_sync_id: string;
  createdAt: string;
  values: VisitFormValues;
  photos: VisitPhotoAsset[];
};

function toRecord(row: ReturnType<typeof getPendingVisits>[number]): PendingVisitRecord {
  const { __pending_attachments: _attachments, pending_photos: _photos, ...values } = row.payload;
  const photos =
    row.pending_photos?.map(pendingPhotoToVisitAsset) ??
    ((_attachments as VisitPhotoAsset[] | undefined) ?? []);
  return {
    id: row.local_sync_id,
    local_sync_id: row.local_sync_id,
    createdAt: row.created_at,
    values: values as VisitFormValues,
    photos
  };
}

export async function readPendingVisits(): Promise<PendingVisitRecord[]> {
  return getPendingVisits()
    .filter((row) => row.status === "pending" || row.status === "syncing" || row.status === "failed")
    .map(toRecord);
}

export async function enqueuePendingVisit(
  record: PendingVisitRecord,
  extraAttachments: PendingVisitAttachment[] = []
): Promise<void> {
  const persistedPhotos = [];
  for (const photo of record.photos) {
    const result = await persistVisitPhotoAsset({
      asset: photo,
      visitLocalSyncId: record.local_sync_id
    });
    if (!result.ok) {
      throw new Error(result.message);
    }
    persistedPhotos.push(result.photo);
  }

  const attachments: PendingVisitAttachment[] = [
    ...persistedPhotos.map((p) => ({
      id: p.local_photo_id,
      attachmentType: "image" as const,
      uri: p.persistent_file_uri,
      name: p.original_filename,
      mimeType: p.mime_type,
      createdAt: p.created_at
    })),
    ...extraAttachments
  ];
  await addToVisitQueue(
    {
      ...record.values,
      __pending_attachments: attachments,
      pending_photos: persistedPhotos
    },
    record.values.farmer_name?.trim() || "Farmer",
    record.values.crop_name?.trim() || "Crop",
    record.local_sync_id
  );
}

export async function removePendingVisit(id: string): Promise<void> {
  removeVisitFromQueue(id);
}

export function generateLocalSyncId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `sync-${Date.now()}-${rand}`;
}
