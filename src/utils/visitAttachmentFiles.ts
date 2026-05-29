import * as ImageManipulator from "expo-image-manipulator";
import { getInfoAsync } from "expo-file-system/legacy";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const PDF_EXTENSIONS = new Set([".pdf"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".aac", ".webm"]);
const DOC_EXTENSIONS = new Set([".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"]);

export type VisitAttachmentType = "image" | "pdf" | "audio" | "text" | "other";

export function extensionOf(filename: string) {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

export function inferAttachmentType(filename: string, mimeType = ""): VisitAttachmentType {
  const ext = extensionOf(filename);
  const mime = mimeType.toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith("image/")) return "image";
  if (PDF_EXTENSIONS.has(ext) || mime === "application/pdf") return "pdf";
  if (AUDIO_EXTENSIONS.has(ext) || mime.startsWith("audio/")) return "audio";
  if (DOC_EXTENSIONS.has(ext)) return "other";
  return "other";
}

export async function getLocalFileSize(uri: string): Promise<number | null> {
  try {
    const info = await getInfoAsync(uri);
    if (info.exists && typeof info.size === "number") {
      return info.size;
    }
  } catch {
    return null;
  }
  return null;
}

export async function assertFileUnderLimit(uri: string, displayName?: string) {
  const size = await getLocalFileSize(uri);
  if (size != null && size > MAX_ATTACHMENT_BYTES) {
    const mb = (MAX_ATTACHMENT_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(`${displayName || "File"} is too large. Maximum size is ${mb} MB.`);
  }
}

/** Compress images before upload when possible. */
export async function prepareImageForUpload(uri: string): Promise<{ uri: string; name: string; mimeType: string }> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }],
      { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
    );
    await assertFileUnderLimit(manipulated.uri, "Photo");
    return {
      uri: manipulated.uri,
      name: `visit-photo-${Date.now()}.jpg`,
      mimeType: "image/jpeg"
    };
  } catch {
    await assertFileUnderLimit(uri, "Photo");
    return {
      uri,
      name: `visit-photo-${Date.now()}.jpg`,
      mimeType: "image/jpeg"
    };
  }
}

export function formatBytes(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function friendlyPickerCancel(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "ERR_CANCELED" || code === "E_PICKER_CANCELLED" || code === "DOCUMENT_PICKER_CANCELED";
}

export function friendlyUploadError(err: unknown): string {
  if (err instanceof Error) {
    if (/internet|network|connection|failed to fetch/i.test(err.message)) {
      return "Attachment upload needs internet connection.";
    }
    return err.message;
  }
  return "Upload failed. Please try again.";
}
