import * as FileSystem from "expo-file-system/legacy";
import type { PendingVisitAttachment } from "../../../src/visit/pendingAttachments";
import type { VisitPhotoAsset } from "../visitPhotos";
import type { PendingVisitPhoto } from "../sync/fieldQueueTypes";
import { generateLocalPhotoId } from "../sync/queueIds";
import { getActiveSyncUserId } from "../sync/queueOwnership";

const PENDING_MEDIA_ROOT = "pending-visit-media";

export type PersistPhotoResult =
  | { ok: true; photo: PendingVisitPhoto }
  | { ok: false; code: "copy_failed" | "missing_source" | "storage_unavailable"; message: string };

export type PersistAttachmentResult =
  | { ok: true; attachment: PendingVisitAttachment; persistedUris: string[] }
  | { ok: false; code: "copy_failed" | "missing_source" | "storage_unavailable"; message: string };

function pendingMediaDir(userId: number, visitLocalSyncId: string): string | null {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  return `${base}${PENDING_MEDIA_ROOT}/${userId}/${visitLocalSyncId}/`;
}

async function ensureDir(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    }
    return true;
  } catch {
    return false;
  }
}

function extensionFor(name: string | undefined, mimeType: string | undefined): string {
  const match = name?.match(/\.([a-zA-Z0-9]{1,8})$/);
  if (match) return match[1].toLowerCase();
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("pdf")) return "pdf";
  if (mimeType?.startsWith("audio/")) return mimeType.split("/")[1]?.split(";")[0] || "audio";
  if (mimeType?.startsWith("image/")) return "jpg";
  return "bin";
}

async function persistFile(params: {
  sourceUri: string;
  destinationUri: string;
  missingMessage: string;
  copyMessage: string;
}): Promise<{ ok: true } | { ok: false; code: "copy_failed" | "missing_source"; message: string }> {
  const sourceInfo = await FileSystem.getInfoAsync(params.sourceUri).catch(() => null);
  if (!sourceInfo?.exists) {
    return { ok: false, code: "missing_source", message: params.missingMessage };
  }
  try {
    await FileSystem.copyAsync({ from: params.sourceUri, to: params.destinationUri });
    return { ok: true };
  } catch {
    return { ok: false, code: "copy_failed", message: params.copyMessage };
  }
}

export async function persistVisitPhotoAsset(params: {
  asset: VisitPhotoAsset;
  visitLocalSyncId: string;
  userId?: number;
}): Promise<PersistPhotoResult> {
  const userId = params.userId ?? getActiveSyncUserId();
  if (userId == null) {
    return { ok: false, code: "storage_unavailable", message: "User not available for photo storage." };
  }

  const dir = pendingMediaDir(userId, params.visitLocalSyncId);
  if (!dir) {
    return { ok: false, code: "storage_unavailable", message: "Document storage is unavailable." };
  }

  const sourceInfo = await FileSystem.getInfoAsync(params.asset.uri).catch(() => null);
  if (!sourceInfo?.exists) {
    return { ok: false, code: "missing_source", message: "Photo file is missing." };
  }

  if (!(await ensureDir(dir))) {
    return { ok: false, code: "copy_failed", message: "Could not create photo storage folder." };
  }

  const localPhotoId = params.asset.id?.startsWith("ph-")
    ? params.asset.id
    : generateLocalPhotoId();
  const ext = params.asset.mimeType?.includes("png") ? "png" : "jpg";
  const dest = `${dir}${localPhotoId}.${ext}`;

  try {
    await FileSystem.copyAsync({ from: params.asset.uri, to: dest });
  } catch {
    return { ok: false, code: "copy_failed", message: "Could not save photo on this device." };
  }

  const destInfo = await FileSystem.getInfoAsync(dest);
  const sizeBytes = destInfo.exists && "size" in destInfo ? Number(destInfo.size ?? 0) : 0;
  const now = new Date().toISOString();

  return {
    ok: true,
    photo: {
      local_photo_id: localPhotoId,
      visit_local_sync_id: params.visitLocalSyncId,
      user_id: userId,
      persistent_file_uri: dest,
      original_filename: params.asset.name,
      mime_type: params.asset.mimeType,
      size_bytes: sizeBytes,
      upload_status: "pending",
      retry_count: 0,
      created_at: now
    }
  };
}

export async function persistPendingAttachmentAsset(params: {
  attachment: PendingVisitAttachment;
  visitLocalSyncId: string;
  userId?: number;
}): Promise<PersistAttachmentResult> {
  const item = params.attachment;
  if (item.attachmentType === "text") {
    return { ok: true, attachment: item, persistedUris: [] };
  }

  const userId = params.userId ?? getActiveSyncUserId();
  const dir = userId == null ? null : pendingMediaDir(userId, params.visitLocalSyncId);
  if (!dir) {
    return { ok: false, code: "storage_unavailable", message: "Document storage is unavailable." };
  }
  if (!(await ensureDir(dir))) {
    return { ok: false, code: "copy_failed", message: "Could not create attachment storage folder." };
  }
  if (!item.uri) {
    return { ok: false, code: "missing_source", message: "Attachment file is missing." };
  }

  const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const primaryUri = `${dir}${safeId}.${extensionFor(item.name, item.mimeType)}`;
  const primary = await persistFile({
    sourceUri: item.uri,
    destinationUri: primaryUri,
    missingMessage: "Attachment file is missing.",
    copyMessage: "Could not save attachment on this device."
  });
  if (!primary.ok) return primary;

  const persistedUris = [primaryUri];
  let originalUri: string | undefined;
  if (item.originalUri) {
    originalUri = `${dir}${safeId}-original.${extensionFor(item.originalName, item.originalMimeType)}`;
    const original = await persistFile({
      sourceUri: item.originalUri,
      destinationUri: originalUri,
      missingMessage: "Original attachment file is missing.",
      copyMessage: "Could not save original attachment on this device."
    });
    if (!original.ok) {
      await deletePersistedPhoto(primaryUri);
      return original;
    }
    persistedUris.push(originalUri);
  }

  return {
    ok: true,
    attachment: { ...item, uri: primaryUri, originalUri },
    persistedUris
  };
}

export async function deletePersistedPhoto(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    /* keep file if delete fails */
  }
}

export function pendingPhotoToVisitAsset(photo: PendingVisitPhoto): VisitPhotoAsset {
  return {
    id: photo.local_photo_id,
    uri: photo.persistent_file_uri,
    name: photo.original_filename,
    mimeType: photo.mime_type
  };
}
