/**
 * Persisted queue for visit photos that failed after the visit row was already saved online.
 * Retries on connectivity restore alongside the visit offline queue.
 */
import { getJson, setJson } from "../storage";
import { uploadVisitPhotos } from "../visitSubmitApi";
import type { VisitPhotoAsset } from "../visitPhotos";

const PENDING_EVIDENCE_KEY = "pending_visit_evidence_v1";
const MAX_ATTEMPTS = 5;

export type PendingEvidenceItem = {
  id: string;
  visit_id: number;
  local_sync_id?: string | null;
  photos: VisitPhotoAsset[];
  created_at: string;
  attempts: number;
  last_error?: string;
};

function readQueue(): PendingEvidenceItem[] {
  const rows = getJson<PendingEvidenceItem[]>(PENDING_EVIDENCE_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

function writeQueue(rows: PendingEvidenceItem[]): void {
  setJson(PENDING_EVIDENCE_KEY, rows);
}

export function enqueueFailedVisitEvidence(params: {
  visitId: number;
  photos: VisitPhotoAsset[];
  localSyncId?: string | null;
  failedNames?: string[];
}): void {
  if (!params.photos.length) return;
  const failedSet = new Set(params.failedNames ?? []);
  const photos =
    failedSet.size > 0
      ? params.photos.filter((p) => failedSet.has(p.name))
      : params.photos;
  if (!photos.length) return;

  const queue = readQueue();
  const id = `ev-${params.visitId}-${Date.now()}`;
  queue.push({
    id,
    visit_id: params.visitId,
    local_sync_id: params.localSyncId ?? null,
    photos,
    created_at: new Date().toISOString(),
    attempts: 0
  });
  writeQueue(queue);
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
      const failed = await uploadVisitPhotos(item.visit_id, item.photos);
      if (failed.length === 0) {
        uploaded += 1;
        continue;
      }
      const nextAttempts = item.attempts + 1;
      remaining.push({
        ...item,
        photos: item.photos.filter((p) => failed.includes(p.name)),
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
