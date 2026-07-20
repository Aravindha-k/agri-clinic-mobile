/**
 * Persisted queue for visit media that failed after the visit row was already saved online.
 * Retries on connectivity restore alongside the visit offline queue.
 * Every row is user-scoped — never flush under another employee.
 */
import { getJson, setJson } from "../storage";
import {
  pendingAttachmentLabel,
  uploadAllPendingAttachments,
  type PendingVisitAttachment
} from "../../../src/visit/pendingAttachments";
import {
  deletePersistedPhoto,
  persistPendingAttachmentAsset
} from "../media/persistentVisitPhotos";
import {
  filterQueueForActiveUser,
  getActiveSyncUserId,
  quarantineOrphanQueueItems
} from "./queueOwnership";

export const PENDING_EVIDENCE_KEY = "pending_visit_evidence_v1";
const MAX_ATTEMPTS = 5;

export type PendingEvidenceItem = {
  id: string;
  visit_id: number;
  local_sync_id?: string | null;
  /** Owning employee user id — required for flush eligibility. */
  user_id?: number;
  attachments: PendingVisitAttachment[];
  created_at: string;
  attempts: number;
  last_error?: string;
};

function readAllQueue(): PendingEvidenceItem[] {
  const rows = getJson<
    Array<
      PendingEvidenceItem & {
        photos?: Array<{
          id?: string;
          uri: string;
          name: string;
          mimeType: string;
        }>;
      }
    >
  >(PENDING_EVIDENCE_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    ...row,
    user_id: row.user_id != null ? Number(row.user_id) : undefined,
    attachments:
      row.attachments ??
      (row.photos ?? []).map((photo) => ({
        id: photo.id ?? `legacy-${row.id}-${photo.name}`,
        attachmentType: "image" as const,
        uri: photo.uri,
        name: photo.name,
        mimeType: photo.mimeType,
        createdAt: row.created_at
      }))
  }));
}

function writeQueue(rows: PendingEvidenceItem[]): void {
  setJson(PENDING_EVIDENCE_KEY, rows);
}

/** Active owner's evidence only. Legacy unowned rows are quarantined, never adopted. */
export function readActiveUserEvidenceQueue(): PendingEvidenceItem[] {
  const all = readAllQueue();
  const userId = getActiveSyncUserId();
  if (userId == null) return [];
  const { owned, orphans } = filterQueueForActiveUser(all, userId);
  if (orphans.length) {
    quarantineOrphanQueueItems("photos", orphans, "evidence_ownership_mismatch_or_missing_user");
    const orphanIds = new Set(orphans.map((o) => o.id));
    writeQueue(all.filter((row) => !orphanIds.has(row.id)));
  }
  return owned;
}

export async function enqueueFailedVisitEvidence(params: {
  visitId: number;
  attachments: PendingVisitAttachment[];
  localSyncId?: string | null;
}): Promise<void> {
  if (!params.attachments.length) return;
  const userId = getActiveSyncUserId();
  if (userId == null) {
    if (__DEV__) {
      console.warn("[evidence] skip enqueue — no active sync user");
    }
    return;
  }
  const id = `ev-${params.visitId}-${Date.now()}`;
  const persistedUris: string[] = [];
  try {
    const attachments: PendingVisitAttachment[] = [];
    for (const attachment of params.attachments) {
      const result = await persistPendingAttachmentAsset({
        attachment,
        visitLocalSyncId: id
      });
      if (!result.ok) throw new Error(result.message);
      attachments.push(result.attachment);
      persistedUris.push(...result.persistedUris);
    }

    const queue = readAllQueue();
    queue.push({
      id,
      visit_id: params.visitId,
      local_sync_id: params.localSyncId ?? null,
      user_id: userId,
      attachments,
      created_at: new Date().toISOString(),
      attempts: 0
    });
    writeQueue(queue);
  } catch (err) {
    await Promise.all(persistedUris.map((uri) => deletePersistedPhoto(uri)));
    throw err;
  }
}

export function getPendingEvidenceCount(): number {
  return readActiveUserEvidenceQueue().filter((row) => row.attempts < MAX_ATTEMPTS).length;
}

export function clearAllPendingEvidence(): void {
  writeQueue([]);
}

export async function flushPendingVisitEvidence(): Promise<{
  uploaded: number;
  remaining: number;
}> {
  const queue = readActiveUserEvidenceQueue();
  if (!queue.length) return { uploaded: 0, remaining: 0 };

  const userId = getActiveSyncUserId();
  const foreignAndOther = readAllQueue().filter(
    (row) => row.user_id != null && userId != null && row.user_id !== userId
  );

  const remaining: PendingEvidenceItem[] = [];
  let uploaded = 0;

  for (const item of queue) {
    if (userId != null && item.user_id !== userId) {
      continue;
    }
    if (item.attempts >= MAX_ATTEMPTS) {
      remaining.push(item);
      continue;
    }
    try {
      const { failed } = await uploadAllPendingAttachments(item.visit_id, item.attachments);
      if (failed.length === 0) {
        await Promise.all(
          item.attachments.flatMap((attachment) =>
            [attachment.uri, attachment.originalUri]
              .filter((uri): uri is string => Boolean(uri))
              .map((uri) => deletePersistedPhoto(uri))
          )
        );
        uploaded += 1;
        continue;
      }
      const nextAttempts = item.attempts + 1;
      const failedSet = new Set(failed);
      remaining.push({
        ...item,
        user_id: item.user_id ?? userId ?? undefined,
        attachments: item.attachments.filter((attachment) =>
          failedSet.has(pendingAttachmentLabel(attachment))
        ),
        attempts: nextAttempts,
        last_error: `Failed uploads: ${failed.join(", ")}`
      });
    } catch (err) {
      remaining.push({
        ...item,
        user_id: item.user_id ?? userId ?? undefined,
        attempts: item.attempts + 1,
        last_error: err instanceof Error ? err.message : "Upload failed"
      });
    }
  }

  writeQueue([...foreignAndOther, ...remaining]);
  return { uploaded, remaining: remaining.length };
}
