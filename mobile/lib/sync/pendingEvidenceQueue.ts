/**
 * Persisted queue for visit photos that failed after the visit row was already saved online.
 * Retries on connectivity restore alongside the visit offline queue.
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

const PENDING_EVIDENCE_KEY = "pending_visit_evidence_v1";
const MAX_ATTEMPTS = 5;

export type PendingEvidenceItem = {
  id: string;
  visit_id: number;
  local_sync_id?: string | null;
  attachments: PendingVisitAttachment[];
  created_at: string;
  attempts: number;
  last_error?: string;
};

function readQueue(): PendingEvidenceItem[] {
  const rows = getJson<Array<PendingEvidenceItem & { photos?: Array<{
    id?: string;
    uri: string;
    name: string;
    mimeType: string;
  }> }>>(PENDING_EVIDENCE_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    ...row,
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

export async function enqueueFailedVisitEvidence(params: {
  visitId: number;
  attachments: PendingVisitAttachment[];
  localSyncId?: string | null;
}): Promise<void> {
  if (!params.attachments.length) return;
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

    const queue = readQueue();
    queue.push({
      id,
      visit_id: params.visitId,
      local_sync_id: params.localSyncId ?? null,
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
  return readQueue().length;
}

export async function flushPendingVisitEvidence(): Promise<{
  uploaded: number;
  remaining: number;
}> {
  const queue = readQueue();
  if (!queue.length) return { uploaded: 0, remaining: 0 };

  const remaining: PendingEvidenceItem[] = [];
  let uploaded = 0;

  for (const item of queue) {
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
        attachments: item.attachments.filter((attachment) =>
          failedSet.has(pendingAttachmentLabel(attachment))
        ),
        attempts: nextAttempts,
        last_error: `Failed uploads: ${failed.join(", ")}`
      });
      if (nextAttempts >= MAX_ATTEMPTS) {
        // Keep the row so diagnostics can show permanent failures; do not drop silently.
      }
    } catch (err) {
      remaining.push({
        ...item,
        attempts: item.attempts + 1,
        last_error: err instanceof Error ? err.message : "Upload failed"
      });
    }
  }

  writeQueue(remaining);
  return { uploaded, remaining: remaining.length };
}
