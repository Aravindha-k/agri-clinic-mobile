import { API_BASE_URL } from "../../src/api/config";
import { refreshAccessTokenOnce } from "../../src/api/tokenRefresh";
import { getDeviceSessionHeaderEntries } from "../../src/api/deviceSessionHeaders";
import { submitMobileVisit, type Visit, type VisitFormValues } from "../../src/api/visits";
import { uploadVisitAttachmentFile } from "../../src/api/visitAttachments";
import { normalizeMobileVisitSubmitPayload } from "../../src/utils/format";
import { isLanOnlyError, isNetworkError } from "../../src/utils/apiError";
import { unwrapSuccessEnvelope } from "../../src/utils/apiUnwrap";
import {
  normalizeVisitSubmitUserMessage,
  visitSubmitErrorFromHttp
} from "../../src/utils/visitSubmitErrors";
import { getAccessToken } from "../../src/storage/tokenStorage";
import { prepareVisitForSubmit } from "../../src/visit/prepareVisitSubmit";
import { validateVisitSubmitValues } from "../../src/visit/visitValidation";
import { problemItemIdsFromSelection } from "../../src/utils/visitProblems";
import { useVisitFormStore, type VisitSeverity } from "../store/visitFormStore";
import {
  getVisitDutyFields,
  visitCaptureTimestamps,
  type VisitDutyFields
} from "./visitDutyContext";
import { isDuplicateVisitResponse } from "./visitDuplicate";
import type { PickedProfileImage } from "../../src/utils/profileImagePick";
import type { VisitPhotoAsset } from "./visitPhotos";

function severityNote(severity: VisitSeverity) {
  if (severity === "low") return "Severity: Low";
  if (severity === "high") return "Severity: High";
  return "Severity: Medium";
}

export type VisitSubmitExtras = {
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  capturedAt?: Date;
  duty?: VisitDutyFields;
};

export function buildVisitFormValuesFromStore(
  state: ReturnType<typeof useVisitFormStore.getState>,
  localSyncId: string,
  extras?: VisitSubmitExtras
): VisitFormValues {
  const farmer = state.farmer;
  const nf = state.newFarmer;
  const problem = state.selectedProblem;
  const selectedProblems = state.selectedProblems?.length
    ? state.selectedProblems
    : problem
      ? [problem]
      : [];
  const isOther = state.problemCategoryCode === "other";
  const problemText = isOther
    ? state.otherProblemDescription.trim()
    : selectedProblems
        .map((item) => item.tamil_name || item.name)
        .filter(Boolean)
        .join(", ");
  const problemItemIds = problemItemIdsFromSelection(selectedProblems);

  const visitNotes = state.fieldNotes.trim() || state.observation.trim();
  // Temporary compatibility adapter: employee enters Field Notes only.
  // Backend columns still use observation + field_notes. Do NOT duplicate into recommendation.
  const lat = extras?.latitude ?? state.gpsCoords?.latitude;
  const lng = extras?.longitude ?? state.gpsCoords?.longitude;
  const accuracy = extras?.accuracy ?? state.gpsCoords?.accuracy ?? null;
  const capture = visitCaptureTimestamps(extras?.capturedAt ?? new Date());

  return {
    farmer_id: farmer?.id != null ? String(farmer.id) : undefined,
    farmer_name: farmer?.name || nf?.name || "",
    farmer_phone: farmer?.phone || nf?.phone || "",
    district: nf?.district_id || (farmer?.district != null ? String(farmer.district) : ""),
    taluk: nf?.taluk_id || (farmer?.taluk != null ? String(farmer.taluk) : ""),
    village: nf?.village_id || (farmer?.village != null ? String(farmer.village) : ""),
    crop: state.cropId,
    crop_name: state.cropName,
    land_name: "",
    land_area: "",
    latitude: lat != null ? String(lat) : undefined,
    longitude: lng != null ? String(lng) : undefined,
    accuracy: accuracy != null ? accuracy : undefined,
    local_sync_id: localSyncId,
    duty_session_id: extras?.duty?.duty_session_id,
    workday_id: extras?.duty?.workday_id,
    captured_at: capture.captured_at,
    visit_date: capture.visit_date,
    visit_time: capture.visit_time,
    observation: visitNotes,
    field_notes: [visitNotes, severityNote(state.severity)].filter(Boolean).join("\n"),
    problem_category_id: isOther ? undefined : state.problemCategoryId || undefined,
    problem_master_id: isOther ? undefined : state.problemMasterId || undefined,
    problem_item_ids: isOther ? [] : problemItemIds,
    problem_seen: problemText,
    problem_description: problemText,
    pest_issue: state.pestIssue,
    disease_issue: state.diseaseIssue,
    // Follow-up capture deferred to v1.1 — do not send a silent false that implies UI support.
    // Legacy typed advice channels omitted for new V2 Field-Notes-only creates.
    recommendation: undefined,
    action_taken: undefined,
    fertilizer_advice: undefined,
    pesticide_advice: undefined,
    irrigation_advice: undefined,
    general_advice: undefined
  };
}

async function postVisitMultipart(
  fields: Record<string, string | string[]>
): Promise<{ visit_id: number; visit: Visit }> {
  const token = await getAccessToken();
  const url = `${API_BASE_URL}mobile/visits/`;
  const formData = new FormData();
  appendVisitMultipartFields(formData, fields);

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
      xhr.timeout = 120_000;
      xhr.onload = async () => {
        try {
          if (xhr.status === 401 && accessToken) {
            const refreshed = await refreshAccessTokenOnce();
            void attempt(refreshed);
            return;
          }
          const text = xhr.responseText || "";
          let data: unknown = null;
          if (text) {
            try {
              data = JSON.parse(text);
            } catch {
              data = null;
            }
          }
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(visitSubmitErrorFromHttp(xhr.status, data, text));
            return;
          }
          const unwrapped = unwrapSuccessEnvelope<{
            visit_id?: number;
            visit?: Visit;
            id?: number;
            duplicate?: boolean;
          }>(data);
          const row = (unwrapped && typeof unwrapped === "object" ? unwrapped : data) as Record<
            string,
            unknown
          >;
          if (isDuplicateVisitResponse(row)) {
            const visitId = Number(row.visit_id ?? row.id ?? 0);
            resolve({
              visit_id: visitId,
              visit: { id: visitId } as Visit
            });
            return;
          }
          const visit = (row.visit ?? row) as Visit;
          const visit_id = Number(row.visit_id ?? visit?.id ?? row.id);
          resolve({ visit_id, visit: { ...visit, id: visit_id } });
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Submit failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Submit timed out. Check signal and try again."));
      xhr.send(formData);
    };
    void attempt(token);
  });
}

function flattenPayload(values: VisitFormValues, localSyncId: string): Record<string, string | string[]> {
  const payload = normalizeMobileVisitSubmitPayload(values as Record<string, unknown>, { localSyncId });
  const flat: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      flat[key] = value.map(String);
      continue;
    }
    if (typeof value === "boolean") flat[key] = value ? "true" : "false";
    else flat[key] = String(value);
  }
  return flat;
}

/** Shared multipart field map for online submit and offline queue sync. */
export function flattenVisitPayloadForMultipart(
  values: VisitFormValues,
  localSyncId: string
): Record<string, string | string[]> {
  return flattenPayload(values, localSyncId);
}

export function appendVisitMultipartFields(
  formData: FormData,
  fields: Record<string, string | string[]>
) {
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== "") formData.append(key, item);
      }
      continue;
    }
    if (value !== "") formData.append(key, value);
  }
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
      if (photo.id) {
        formData.append("client_upload_id", photo.id);
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Accept", "application/json");
        void (async () => {
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            const sessionHeaders = await getDeviceSessionHeaderEntries();
            for (const [name, value] of Object.entries(sessionHeaders)) {
              xhr.setRequestHeader(name, value);
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
              return;
            }
            reject(new Error("Media upload failed"));
          };
          xhr.onerror = () => reject(new Error("Media upload failed"));
          xhr.send(formData);
        })();
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
  localSyncId: string,
  extras?: VisitSubmitExtras
): Promise<{ visit: Visit; evidenceFailed: string[] }> {
  const duty = extras?.duty ?? (await getVisitDutyFields());
  const values = buildVisitFormValuesFromStore(state, localSyncId, { ...extras, duty });
  const pendingFarmerPhoto =
    (state as { pendingFarmerPhoto?: PickedProfileImage | null }).pendingFarmerPhoto ?? null;
  const prepared = await prepareVisitForSubmit(values, { pendingFarmerPhoto });
  const validationError = validateVisitSubmitValues(prepared);
  if (validationError) {
    throw new Error(validationError);
  }

  let visit: Visit;

  try {
    const flat = flattenPayload(prepared, localSyncId);
    const result = await postVisitMultipart(flat);
    visit = result.visit;
  } catch (multipartErr) {
    try {
      visit = await submitMobileVisit(prepared, { localSyncId });
    } catch (jsonErr) {
      throw new Error(normalizeVisitSubmitUserMessage(jsonErr ?? multipartErr));
    }
  }

  const evidenceFailed = state.photos.length ? await uploadVisitPhotos(visit.id, state.photos) : [];
  return { visit, evidenceFailed };
}

export function isOfflineSubmitError(err: unknown) {
  return isLanOnlyError(err) || isNetworkError(err);
}
