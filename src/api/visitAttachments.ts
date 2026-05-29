import { API_BASE_URL } from "./config";
import { getDeviceSessionHeaderEntries } from "./deviceSessionHeaders";
import { DEVICE_SESSION_CONFLICT_MESSAGE } from "../constants/deviceSession";
import { getAccessToken, getRefreshToken, updateAccessToken, clearTokens } from "../storage/tokenStorage";
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

export function listVisitAttachments(visitId: number) {
  return apiClient<VisitAttachment[] | { results: VisitAttachment[] }>(BASE(visitId)).then((data) =>
    resolveList<VisitAttachment>(data)
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
      throw new Error(DEVICE_SESSION_CONFLICT_MESSAGE);
    }
    throw new Error(formatApiErrorMessage(data, "Upload failed", xhr.status));
  }
  const unwrapped = unwrapSuccessEnvelope<VisitAttachment>(data);
  if (!unwrapped || typeof unwrapped !== "object") {
    throw new Error("Upload response was invalid.");
  }
  return unwrapped;
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
              const refresh = await getRefreshToken();
              if (!refresh) {
                await clearTokens();
                reject(new Error("Session expired. Please sign in again."));
                return;
              }
              const res = await fetch(`${API_BASE_URL}auth/refresh/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh })
              });
              const body = (await res.json()) as Record<string, unknown>;
              const newAccess =
                (typeof body.access === "string" && body.access) ||
                (typeof body.data === "object" &&
                  body.data &&
                  typeof (body.data as Record<string, unknown>).access === "string" &&
                  (body.data as Record<string, unknown>).access) ||
                null;
              if (!newAccess || typeof newAccess !== "string") {
                await clearTokens();
                reject(new Error("Session expired. Please sign in again."));
                return;
              }
              await updateAccessToken(newAccess);
              void attempt(newAccess);
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
