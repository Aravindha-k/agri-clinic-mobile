import { API_BASE_URL } from "./config";
import { refreshAccessTokenOnce } from "./tokenRefresh";
import { getDeviceSessionHeaderEntries } from "./deviceSessionHeaders";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { getAccessToken } from "../storage/tokenStorage";
import { handleDeviceSessionConflict } from "../storage/sessionConflict";
import { formatApiErrorMessage, isDeviceSessionConflictPayload } from "../utils/apiError";
import { resolveList, unwrapSuccessEnvelope } from "../utils/apiUnwrap";
import { apiClient } from "./client";

export type VisitAttachmentType = "image" | "pdf" | "audio" | "text" | "other";

export type VisitAttachment = {
  id: number;
  visit: number;
  employee?: number;
  attachment_type: VisitAttachmentType;
  file_url: string | null;
  text_content: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  uploaded_by?: number;
  uploaded_by_username?: string;
  employee_username?: string;
};

export type LocalFilePayload = {
  uri: string;
  name: string;
  mimeType: string;
  attachmentType: VisitAttachmentType;
};

const BASE = (visitId: number) => `mobile/visits/${visitId}/attachments/`;

const ATTACHMENT_TYPES = new Set<VisitAttachmentType>(["image", "pdf", "audio", "text", "other"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstString(...candidates: unknown[]): string | null {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function extractNestedFileUrl(row: Record<string, unknown>): string | null {
  const direct = firstString(row.file_url, row.file, row.url, row.media_url, row.photo_url, row.photo);
  if (direct) return direct;
  const fileObj = asRecord(row.file);
  if (fileObj) {
    return firstString(fileObj.url, fileObj.file_url, fileObj.path, fileObj.uri);
  }
  return null;
}

function coerceAttachmentType(
  raw: unknown,
  mimeType: string | null,
  fileUrl: string | null
): VisitAttachmentType {
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase() as VisitAttachmentType;
    if (ATTACHMENT_TYPES.has(normalized)) return normalized;
  }
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "text";
  if (fileUrl && /\.(jpe?g|png|webp)(\?|$)/i.test(fileUrl)) return "image";
  return "other";
}

/** Normalize create/list attachment payloads into one UI shape. */
export function normalizeVisitAttachment(raw: unknown): VisitAttachment | null {
  const root = asRecord(raw);
  if (!root) return null;
  const nested =
    asRecord(root.attachment) ||
    asRecord(root.data) ||
    asRecord(root.result) ||
    root;

  const id = Number(nested.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const mime_type = firstString(nested.mime_type, nested.mimeType, nested.content_type);
  const file_url = extractNestedFileUrl(nested) || extractNestedFileUrl(root);
  const attachment_type = coerceAttachmentType(nested.attachment_type ?? nested.type, mime_type, file_url);

  return {
    id,
    visit: Number(nested.visit) || 0,
    employee: typeof nested.employee === "number" ? nested.employee : undefined,
    attachment_type,
    file_url,
    text_content: firstString(nested.text_content, nested.textContent),
    original_filename: firstString(nested.original_filename, nested.originalFilename, nested.filename, nested.name),
    mime_type,
    file_size:
      typeof nested.file_size === "number"
        ? nested.file_size
        : typeof nested.size === "number"
          ? nested.size
          : null,
    uploaded_at:
      firstString(nested.uploaded_at, nested.created_at, nested.updated_at) || new Date().toISOString(),
    uploaded_by: typeof nested.uploaded_by === "number" ? nested.uploaded_by : undefined,
    uploaded_by_username: firstString(nested.uploaded_by_username) || undefined,
    employee_username: firstString(nested.employee_username) || undefined
  };
}

export function isDisplayableVisitImage(attachment: VisitAttachment | null | undefined): boolean {
  return Boolean(attachment && attachment.attachment_type === "image" && attachment.file_url?.trim());
}

/** Prefer newer rows; keep stable unique ids. */
export function mergeVisitAttachmentsById(
  existing: VisitAttachment[],
  incoming: VisitAttachment[]
): VisitAttachment[] {
  const byId = new Map<number, VisitAttachment>();
  for (const row of existing) {
    byId.set(row.id, row);
  }
  for (const row of incoming) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.uploaded_at || 0).getTime();
    const tb = new Date(b.uploaded_at || 0).getTime();
    return tb - ta;
  });
}

export function listVisitAttachments(visitId: number, options?: { dedupe?: boolean }) {
  return apiClient<VisitAttachment[] | { results: VisitAttachment[] }>(BASE(visitId), {
    dedupe: options?.dedupe
  }).then((data) =>
    resolveList<unknown>(data)
      .map((row) => normalizeVisitAttachment(row))
      .filter((row): row is VisitAttachment => row != null)
  );
}

export function uploadVisitTextNote(visitId: number, textContent: string) {
  return apiClient<VisitAttachment>(BASE(visitId), {
    method: "POST",
    body: JSON.stringify({
      attachment_type: "text",
      text_content: textContent
    })
  });
}

async function parseUploadResponse(xhr: XMLHttpRequest): Promise<VisitAttachment> {
  const text = xhr.responseText || "";
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Server returned an unexpected response.");
    }
  }
  if (xhr.status < 200 || xhr.status >= 300) {
    if (isDeviceSessionConflictPayload(data, xhr.status)) {
      void handleDeviceSessionConflict();
      throw new Error(SESSION_REPLACED_MESSAGE);
    }
    throw new Error(formatApiErrorMessage(data, "Upload failed", xhr.status));
  }
  const unwrapped = unwrapSuccessEnvelope<unknown>(data);
  const normalized = normalizeVisitAttachment(unwrapped);
  if (!normalized) {
    throw new Error("Upload response was invalid.");
  }
  return normalized;
}

export function uploadVisitAttachmentFile(
  visitId: number,
  file: LocalFilePayload,
  onProgress?: (progress: number) => void
): Promise<VisitAttachment> {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAccessToken();
      const url = `${API_BASE_URL}${BASE(visitId)}`;
      const formData = new FormData();
      formData.append("attachment_type", file.attachmentType);
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType
      } as unknown as Blob);

      const attempt = async (accessToken: string | null) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Accept", "application/json");
        if (accessToken) {
          xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
          const sessionHeaders = await getDeviceSessionHeaderEntries();
          for (const [name, value] of Object.entries(sessionHeaders)) {
            xhr.setRequestHeader(name, value);
          }
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.min(1, event.loaded / event.total));
          }
        };

        xhr.onload = async () => {
          try {
            if (xhr.status === 401 && accessToken) {
              try {
                const newAccess = await refreshAccessTokenOnce();
                void attempt(newAccess);
              } catch (err) {
                reject(err instanceof Error ? err : new Error("Upload failed"));
              }
              return;
            }
            const attachment = await parseUploadResponse(xhr);
            resolve(attachment);
          } catch (err) {
            reject(err instanceof Error ? err : new Error("Upload failed"));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Attachment upload needs internet connection."));
        };

        xhr.ontimeout = () => {
          reject(new Error("Upload timed out. Please try again."));
        };

        xhr.timeout = 120000;
        xhr.send(formData);
      };

      void attempt(token);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Upload failed"));
    }
  });
}

export function deleteVisitAttachment(visitId: number, attachmentId: number) {
  return apiClient<void>(`${BASE(visitId)}${attachmentId}/`, {
    method: "DELETE"
  });
}
