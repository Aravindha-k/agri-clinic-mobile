import * as SecureStore from "expo-secure-store";
import { VisitFormValues } from "../api/visits";
import type { PickedProfileImage } from "../utils/profileImagePick";
import { PendingVisitAttachment } from "../visit/pendingAttachments";

const QUEUE_KEY = "agri_offline_visit_queue";

export type QueuedVisit = {
  id: string;
  values: VisitFormValues;
  pendingAttachments?: PendingVisitAttachment[];
  pendingFarmerPhoto?: PickedProfileImage | null;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

async function readQueue(): Promise<QueuedVisit[]> {
  const raw = await SecureStore.getItemAsync(QUEUE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as QueuedVisit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedVisit[]) {
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(items));
}

export async function getQueuedVisits(): Promise<QueuedVisit[]> {
  return readQueue();
}

export async function enqueueVisit(
  values: VisitFormValues,
  pendingAttachments: PendingVisitAttachment[] = [],
  pendingFarmerPhoto: PickedProfileImage | null = null
): Promise<QueuedVisit> {
  const queue = await readQueue();
  const syncId = values.local_sync_id?.trim() || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const item: QueuedVisit = {
    id: syncId,
    values: { ...values, local_sync_id: syncId },
    pendingAttachments,
    pendingFarmerPhoto: pendingFarmerPhoto ?? undefined,
    createdAt: new Date().toISOString(),
    attempts: 0
  };
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function removeQueuedVisit(id: string) {
  const queue = await readQueue();
  await writeQueue(queue.filter((q) => q.id !== id));
}

export async function updateQueuedVisit(item: QueuedVisit) {
  const queue = await readQueue();
  await writeQueue(queue.map((q) => (q.id === item.id ? item : q)));
}
