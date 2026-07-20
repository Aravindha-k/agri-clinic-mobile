import { uploadFarmerPhoto } from "../api/profilePhotos";
import type { PickedProfileImage } from "../utils/profileImagePick";
import { isNetworkError } from "../utils/apiError";
import {
  clearPendingFarmerPhoto,
  enqueuePendingFarmerPhoto,
  type PendingFarmerPhotoRecord
} from "../../mobile/lib/sync/pendingFarmerPhotoQueue";

const inFlightByFarmer = new Set<string>();

export type PendingFarmerPhotoUploadResult =
  | { ok: true; uploaded: true; farmerId: string }
  | { ok: true; uploaded: false; reason: "skipped" }
  | { ok: false; retryable: boolean; message: string; farmerId: string };

function isMissingFileError(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    message.includes("no such file") ||
    message.includes("could not be read") ||
    message.includes("unable to read") ||
    message.includes("file not found") ||
    message.includes("enoent")
  );
}

/**
 * Upload a pending local farmer photo after the farmer exists on the server.
 * Idempotent for concurrent callers; does not fail the farmer/visit if upload fails.
 */
export async function uploadPendingFarmerPhotoIfNeeded(
  farmerId: string | undefined,
  pending: PickedProfileImage | null | undefined,
  options?: { enqueueOnFailure?: boolean; recordId?: string }
): Promise<PendingFarmerPhotoUploadResult> {
  if (!pending || !farmerId || !/^\d+$/.test(farmerId.trim())) {
    return { ok: true, uploaded: false, reason: "skipped" };
  }
  if (!pending.uri?.trim()) {
    return { ok: true, uploaded: false, reason: "skipped" };
  }

  const id = farmerId.trim();
  if (inFlightByFarmer.has(id)) {
    return { ok: true, uploaded: false, reason: "skipped" };
  }

  inFlightByFarmer.add(id);
  try {
    await uploadFarmerPhoto(Number(id), pending);
    if (options?.recordId) {
      clearPendingFarmerPhoto(options.recordId);
    }
    return { ok: true, uploaded: true, farmerId: id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Photo upload failed";
    const retryable = isNetworkError(err) || !isMissingFileError(err);
    if (options?.enqueueOnFailure !== false && retryable) {
      enqueuePendingFarmerPhoto({
        farmerId: id,
        photo: pending,
        lastError: message
      });
    } else if (options?.recordId && !retryable) {
      clearPendingFarmerPhoto(options.recordId);
    }
    return { ok: false, retryable, message, farmerId: id };
  } finally {
    inFlightByFarmer.delete(id);
  }
}

/** Flush user-scoped pending farmer photos after reconnect / visit sync. */
export async function flushPendingFarmerPhotos(
  records: PendingFarmerPhotoRecord[]
): Promise<{ uploaded: number; remaining: number }> {
  let uploaded = 0;
  let remaining = 0;
  for (const row of records) {
    const result = await uploadPendingFarmerPhotoIfNeeded(row.farmer_id, row.photo, {
      enqueueOnFailure: false,
      recordId: row.id
    });
    if (result.ok && result.uploaded) {
      uploaded += 1;
      clearPendingFarmerPhoto(row.id);
      continue;
    }
    if (result.ok && !result.uploaded) {
      clearPendingFarmerPhoto(row.id);
      continue;
    }
    const { bumpPendingFarmerPhotoAttempt } = await import(
      "../../mobile/lib/sync/pendingFarmerPhotoQueue"
    );
    bumpPendingFarmerPhotoAttempt(row.id, result.ok === false ? result.message : undefined);
    if (result.ok === false && !result.retryable) {
      clearPendingFarmerPhoto(row.id);
    } else {
      remaining += 1;
    }
  }
  return { uploaded, remaining };
}
