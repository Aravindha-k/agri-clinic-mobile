import type { VisitFormValues } from "../../src/api/visits";
import type { PendingVisitAttachment } from "../../src/visit/pendingAttachments";
import {
  deletePersistedPhoto,
  persistPendingAttachmentAsset,
  persistVisitPhotoAsset,
  pendingPhotoToVisitAsset
} from "./media/persistentVisitPhotos";
import { addToVisitQueue, getPendingVisits, removeVisitFromQueue } from "./sync/offlineSyncManager";
import type { VisitPhotoAsset } from "./visitPhotos";
import type { PendingVisitStatus } from "./sync/fieldQueueTypes";

export const PENDING_VISITS_KEY = "pending_visits_v1";

export type PendingVisitRecord = {
  id: string;
  local_sync_id: string;
  createdAt: string;
  values: VisitFormValues;
  photos: VisitPhotoAsset[];
  status: PendingVisitStatus;
  attempts: number;
  lastError?: string;
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
    photos,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error
  };
}

export async function readPendingVisits(): Promise<PendingVisitRecord[]> {
  return getPendingVisits()
    .filter(
      (row) =>
        row.status === "pending" ||
        row.status === "syncing" ||
        row.status === "failed" ||
        row.status === "quarantined"
    )
    .map(toRecord);
}

export async function enqueuePendingVisit(
  record: PendingVisitRecord,
  extraAttachments: PendingVisitAttachment[] = []
): Promise<void> {
  if (getPendingVisits().some((visit) => visit.local_sync_id === record.local_sync_id)) {
    return;
  }
  const persistedUris: string[] = [];
  try {
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
      persistedUris.push(result.photo.persistent_file_uri);
    }

    const persistedExtras: PendingVisitAttachment[] = [];
    for (const attachment of extraAttachments) {
      const result = await persistPendingAttachmentAsset({
        attachment,
        visitLocalSyncId: record.local_sync_id
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      persistedExtras.push(result.attachment);
      persistedUris.push(...result.persistedUris);
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
      ...persistedExtras
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
  } catch (err) {
    await Promise.all(persistedUris.map((uri) => deletePersistedPhoto(uri)));
    throw err;
  }
}

export async function removePendingVisit(id: string): Promise<void> {
  const row = getPendingVisits().find((visit) => visit.local_sync_id === id);
  removeVisitFromQueue(id);
  await Promise.all(
    (row?.pending_photos ?? []).map((photo) => deletePersistedPhoto(photo.persistent_file_uri))
  );
}

export function generateLocalSyncId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `sync-${Date.now()}-${rand}`;
}
