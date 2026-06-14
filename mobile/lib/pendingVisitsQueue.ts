import type { VisitFormValues } from "../../src/api/visits";
import type { PendingVisitAttachment } from "../../src/visit/pendingAttachments";
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
  const { __pending_attachments: _attachments, ...values } = row.payload;
  return {
    id: row.local_sync_id,
    local_sync_id: row.local_sync_id,
    createdAt: row.created_at,
    values: values as VisitFormValues,
    photos: []
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
  const attachments: PendingVisitAttachment[] = [
    ...record.photos.map((p) => ({
      id: p.id,
      attachmentType: "image" as const,
      uri: p.uri,
      name: p.name,
      mimeType: p.mimeType,
      createdAt: new Date().toISOString()
    })),
    ...extraAttachments
  ];
  await addToVisitQueue(
    { ...record.values, __pending_attachments: attachments },
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
