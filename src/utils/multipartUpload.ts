import { API_BASE_URL } from "../api/config";
import { refreshAccessTokenOnce } from "../api/tokenRefresh";
import { getDeviceSessionHeaderEntries } from "../api/deviceSessionHeaders";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { getAccessToken } from "../storage/tokenStorage";
import { handleDeviceSessionConflict } from "../storage/sessionConflict";
import {
  formatApiErrorMessage,
  isDeviceSessionConflictPayload
} from "../utils/apiError";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";

export type MultipartFilePayload = {
  uri: string;
  name: string;
  mimeType: string;
};

async function parseJsonResponse(xhr: XMLHttpRequest): Promise<unknown> {
  const text = xhr.responseText || "";
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Server returned an unexpected response.");
  }
}

type MultipartOptions = {
  method?: "POST" | "PATCH" | "PUT";
};

/**
 * Upload multipart/form-data with auth refresh (PATCH for profile photos).
 */
export function uploadMultipart(
  path: string,
  fields: Record<string, string>,
  file: MultipartFilePayload,
  fileFieldName = "profile_photo",
  onProgress?: (progress: number) => void,
  options: MultipartOptions = {}
): Promise<unknown> {
  const httpMethod = options.method ?? "POST";

  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAccessToken();
      const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
      formData.append(fileFieldName, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType
      } as unknown as Blob);

      const attempt = async (accessToken: string | null) => {
        const xhr = new XMLHttpRequest();
        xhr.open(httpMethod, url);
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

            const data = await parseJsonResponse(xhr);
            if (xhr.status < 200 || xhr.status >= 300) {
              if (isDeviceSessionConflictPayload(data, xhr.status)) {
                void handleDeviceSessionConflict();
                reject(new Error(SESSION_REPLACED_MESSAGE));
                return;
              }
              reject(new Error(formatApiErrorMessage(data, "Upload failed", xhr.status)));
              return;
            }
            resolve(unwrapSuccessEnvelope(data) ?? data);
          } catch (err) {
            reject(err instanceof Error ? err : new Error("Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Upload needs an internet connection."));
        xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));
        xhr.timeout = 120000;
        xhr.send(formData);
      };

      void attempt(token);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Upload failed"));
    }
  });
}
