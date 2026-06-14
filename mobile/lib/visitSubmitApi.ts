import { API_BASE_URL } from "../../src/api/config";
import { refreshAccessTokenOnce } from "../../src/api/tokenRefresh";
import { getDeviceSessionHeaderEntries } from "../../src/api/deviceSessionHeaders";
import { submitMobileVisit, type Visit, type VisitFormValues } from "../../src/api/visits";
import { uploadVisitAttachmentFile } from "../../src/api/visitAttachments";
import { normalizeMobileVisitSubmitPayload } from "../../src/utils/format";
import { isLanOnlyError, isNetworkError } from "../../src/utils/apiError";
import { unwrapSuccessEnvelope } from "../../src/utils/apiUnwrap";
import { getAccessToken } from "../../src/storage/tokenStorage";
import type { VisitPhotoAsset } from "./visitPhotos";
import { useVisitFormStore, type VisitSeverity } from "../store/visitFormStore";

function severityNote(severity: VisitSeverity) {
  if (severity === "low") return "Severity: Low";
  if (severity === "high") return "Severity: High";
  return "Severity: Medium";
}

export function buildVisitFormValuesFromStore(
  state: ReturnType<typeof useVisitFormStore.getState>,
  localSyncId: string
): VisitFormValues {
  const farmer = state.farmer;
  const nf = state.newFarmer;
  const problem = state.selectedProblem;
  const isOther = state.problemCategoryCode === "other";
  const problemText = isOther
    ? state.otherProblemDescription.trim()
    : problem?.tamil_name || problem?.name || "";

  const advice = state.recommendation.trim() || state.actionTaken.trim();

  return {
    farmer_id: farmer?.id != null ? String(farmer.id) : undefined,
    farmer_name: farmer?.name || nf?.name || "",
    farmer_phone: farmer?.phone || nf?.phone || "",
    district: nf?.district_id || (farmer?.district != null ? String(farmer.district) : ""),
    village: nf?.village_id || (farmer?.village != null ? String(farmer.village) : ""),
    crop: state.cropId,
    crop_name: state.cropName,
    land_name: "",
    land_area: "",
    latitude: state.gpsCoords?.latitude != null ? String(state.gpsCoords.latitude) : undefined,
    longitude: state.gpsCoords?.longitude != null ? String(state.gpsCoords.longitude) : undefined,
    local_sync_id: localSyncId,
    observation: state.observation.trim(),
    field_notes: [state.fieldNotes.trim(), severityNote(state.severity)].filter(Boolean).join("\n"),
    problem_category_id: isOther ? undefined : state.problemCategoryId || undefined,
    problem_master_id: isOther ? undefined : state.problemMasterId || undefined,
    problem_seen: problemText,
    problem_description: problemText,
    pest_issue: state.pestIssue,
    disease_issue: state.diseaseIssue,
    follow_up_required: false,
    recommendation: advice || undefined,
    action_taken: advice || undefined,
    fertilizer_advice: state.fertilizerAdvice.trim() || undefined,
    pesticide_advice: state.pesticideAdvice.trim() || undefined,
    irrigation_advice: state.irrigationAdvice.trim() || undefined,
    general_advice: state.generalAdvice.trim() || undefined
  };
}

async function postVisitMultipart(fields: Record<string, string>): Promise<{ visit_id: number; visit: Visit }> {
  const token = await getAccessToken();
  const url = `${API_BASE_URL}mobile/visits/`;
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== "") formData.append(key, value);
  }

  return new Promise((resolve, reject) => {
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
      xhr.onload = async () => {
        try {
          if (xhr.status === 401 && accessToken) {
            const refreshed = await refreshAccessTokenOnce();
            void attempt(refreshed);
            return;
          }
          const text = xhr.responseText || "";
          const data = text ? JSON.parse(text) : null;
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(typeof data === "object" && data ? JSON.stringify(data) : "Submit failed"));
            return;
          }
          const unwrapped = unwrapSuccessEnvelope<{
            visit_id?: number;
            visit?: Visit;
            id?: number;
          }>(data);
          const row = (unwrapped && typeof unwrapped === "object" ? unwrapped : data) as Record<string, unknown>;
          const visit = (row.visit ?? row) as Visit;
          const visit_id = Number(row.visit_id ?? visit?.id ?? row.id);
          resolve({ visit_id, visit: { ...visit, id: visit_id } });
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Submit failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    };
    void attempt(token);
  });
}

function flattenPayload(values: VisitFormValues, localSyncId: string): Record<string, string> {
  const payload = normalizeMobileVisitSubmitPayload(values as Record<string, unknown>, { localSyncId });
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    if (typeof value === "boolean") flat[key] = value ? "true" : "false";
    else flat[key] = String(value);
  }
  return flat;
}

/** Shared multipart field map for online submit and offline queue sync. */
export function flattenVisitPayloadForMultipart(
  values: VisitFormValues,
  localSyncId: string
): Record<string, string> {
  return flattenPayload(values, localSyncId);
}

async function uploadVisitMedia(visitId: number, photo: VisitPhotoAsset) {
  const paths = [`mobile/visits/${visitId}/media/`, `mobile/visits/${visitId}/attachments/`];
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      const token = await getAccessToken();
      const url = `${API_BASE_URL}${path}`;
      const formData = new FormData();
      formData.append("file", {
        uri: photo.uri,
        name: photo.name,
        type: photo.mimeType
      } as unknown as Blob);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Accept", "application/json");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Media upload failed")));
        xhr.onerror = () => reject(new Error("Media upload failed"));
        xhr.send(formData);
      });
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Media upload failed");
    }
  }
  if (lastError) throw lastError;
}

export async function uploadVisitPhotos(visitId: number, photos: VisitPhotoAsset[]) {
  const failed: string[] = [];
  for (const photo of photos) {
    try {
      await uploadVisitMedia(visitId, photo);
    } catch {
      try {
        await uploadVisitAttachmentFile(visitId, {
          uri: photo.uri,
          name: photo.name,
          mimeType: photo.mimeType,
          attachmentType: "image"
        });
      } catch {
        failed.push(photo.name);
      }
    }
  }
  return failed;
}

export async function submitVisitFromStore(
  state: ReturnType<typeof useVisitFormStore.getState>,
  localSyncId: string
): Promise<{ visit: Visit; evidenceFailed: string[] }> {
  const values = buildVisitFormValuesFromStore(state, localSyncId);
  let visit: Visit;

  try {
    const flat = flattenPayload(values, localSyncId);
    const result = await postVisitMultipart(flat);
    visit = result.visit;
  } catch {
    visit = await submitMobileVisit(values, { localSyncId });
  }

  const evidenceFailed = state.photos.length ? await uploadVisitPhotos(visit.id, state.photos) : [];
  return { visit, evidenceFailed };
}

export function isOfflineSubmitError(err: unknown) {
  return isLanOnlyError(err) || isNetworkError(err);
}
