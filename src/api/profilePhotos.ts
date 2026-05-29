import { apiClient } from "./client";
import type { Employee } from "./employees";
import type { Farmer } from "./farmers";
import { extractPhotoUrl, extractPhotoUpdatedAt } from "../utils/profilePhotoUrl";
import { uploadMultipart, type MultipartFilePayload } from "../utils/multipartUpload";

/** Canonical backend paths (try in order). */
const EMPLOYEE_PHOTO_PATHS = [
  "mobile/profile/photo/",
  "employees/me/photo/"
] as const;

const farmerPhotoPaths = (farmerId: number) => [
  `mobile/farmers/${farmerId}/photo/`,
  `farmers/${farmerId}/photo/`
];

export type ProfilePhotoUploadResult = {
  photo_url: string | null;
  profile_photo_url: string | null;
  profile_photo_updated_at: string | null;
  entity?: Employee | Farmer | Record<string, unknown>;
};

function parsePhotoUploadResponse(data: unknown): ProfilePhotoUploadResult {
  if (!data || typeof data !== "object") {
    return {
      photo_url: null,
      profile_photo_url: null,
      profile_photo_updated_at: null
    };
  }
  const row = data as Record<string, unknown>;
  const nested =
    row.employee && typeof row.employee === "object"
      ? (row.employee as Record<string, unknown>)
      : row.farmer && typeof row.farmer === "object"
        ? (row.farmer as Record<string, unknown>)
        : row.data && typeof row.data === "object"
          ? (row.data as Record<string, unknown>)
          : row;

  const profile_photo_url = extractPhotoUrl(nested) || extractPhotoUrl(row);
  const profile_photo_updated_at =
    extractPhotoUpdatedAt(nested) || extractPhotoUpdatedAt(row);

  return {
    photo_url: profile_photo_url,
    profile_photo_url,
    profile_photo_updated_at,
    entity: nested as Employee | Farmer
  };
}

async function tryUpload(
  paths: readonly string[],
  file: MultipartFilePayload,
  onProgress?: (p: number) => void
) {
  const fieldNames = ["profile_photo", "file", "photo", "image"] as const;
  let lastError: Error | null = null;

  for (const path of paths) {
    for (const field of fieldNames) {
      try {
        const data = await uploadMultipart(path, {}, file, field, onProgress, {
          method: "PATCH"
        });
        return parsePhotoUploadResponse(data);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Upload failed");
        const msg = lastError.message.toLowerCase();
        if (!msg.includes("not found") && !msg.includes("404") && !msg.includes("405")) {
          throw lastError;
        }
      }
    }
  }
  throw lastError ?? new Error("Photo upload is not available on the server yet.");
}

export function uploadEmployeePhoto(file: MultipartFilePayload, onProgress?: (p: number) => void) {
  return tryUpload(EMPLOYEE_PHOTO_PATHS, file, onProgress);
}

export async function uploadFarmerPhoto(
  farmerId: number,
  file: MultipartFilePayload,
  onProgress?: (p: number) => void
) {
  return tryUpload(farmerPhotoPaths(farmerId), file, onProgress);
}

/** Refresh employee after photo upload. */
export function refreshCurrentEmployee() {
  return import("./employees").then(({ getCurrentEmployee }) => getCurrentEmployee());
}

/** Refresh farmer row after photo upload. */
export function refreshFarmer(farmerId: number) {
  return apiClient<Farmer>(`farmers/${farmerId}/`);
}
