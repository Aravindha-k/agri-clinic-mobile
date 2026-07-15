import { getJson, setJson } from "../storage";
import type { QuarantinedQueueRecord } from "./fieldQueueTypes";

export const QUARANTINE_STORAGE_KEY = "pending_queue_quarantine_v1";

export type OwnedQueueItem = {
  user_id?: number;
};

let activeSyncUserId: number | null = null;
const activeUserListeners = new Set<(userId: number | null) => void>();

export function setActiveSyncUserId(userId: number | null): void {
  if (activeSyncUserId === userId) return;
  activeSyncUserId = userId;
  for (const listener of activeUserListeners) {
    listener(userId);
  }
}

export function getActiveSyncUserId(): number | null {
  return activeSyncUserId;
}

export function subscribeActiveSyncUserId(
  listener: (userId: number | null) => void
): () => void {
  activeUserListeners.add(listener);
  return () => activeUserListeners.delete(listener);
}

export function filterQueueForActiveUser<T extends OwnedQueueItem>(
  items: T[],
  userId: number | null
): { owned: T[]; orphans: T[] } {
  if (userId == null) {
    return { owned: [], orphans: items };
  }
  const owned: T[] = [];
  const orphans: T[] = [];
  for (const item of items) {
    if (item.user_id == null) {
      orphans.push(item);
    } else if (item.user_id === userId) {
      owned.push(item);
    } else {
      orphans.push(item);
    }
  }
  return { owned, orphans };
}

export function readQuarantineRecords(): QuarantinedQueueRecord[] {
  return getJson<QuarantinedQueueRecord[]>(QUARANTINE_STORAGE_KEY, []);
}

export function appendQuarantineRecords(records: QuarantinedQueueRecord[]): void {
  if (!records.length) return;
  const existing = readQuarantineRecords();
  setJson(QUARANTINE_STORAGE_KEY, [...existing, ...records]);
}

export function quarantineOrphanQueueItems<T extends OwnedQueueItem & { created_at?: string }>(
  queue: "visits" | "gps" | "photos" | "workday",
  orphans: T[],
  reason: string
): void {
  if (!orphans.length) return;
  const now = new Date().toISOString();
  appendQuarantineRecords(
    orphans.map((item, index) => ({
      id: `q-${queue}-${Date.now()}-${index}`,
      queue,
      reason,
      created_at: item.created_at ?? now,
      payload: item
    }))
  );
  if (__DEV__) {
    console.warn(`[offlineSync] quarantined ${orphans.length} ${queue} record(s): ${reason}`);
  }
}

export function assertQueueItemOwnedBy<T extends OwnedQueueItem>(
  item: T,
  userId: number
): boolean {
  return item.user_id === userId;
}
