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
      throw new Error(SESSION_REPLACED_MESSAGE);
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
