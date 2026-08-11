import { API_BASE_URL } from "../../src/api/config";
import { apiClient } from "../../src/api/client";
import { getDeviceSessionHeaderEntries } from "../../src/api/deviceSessionHeaders";
import { getFarmerVisits } from "../../src/api/farmers";
import {
  deleteVisitAttachment,
  isDisplayableVisitImage,
  listVisitAttachments,
  mergeVisitAttachmentsById,
  normalizeVisitAttachment,
  type VisitAttachment
} from "../../src/api/visitAttachments";
import { getMobileVisit, type Visit } from "../../src/api/visits";
import { getAccessToken } from "../../src/storage/tokenStorage";
import { normalizeVisitFromApi } from "../../src/utils/visitFarmer";
import type { VisitPhotoAsset } from "./visitPhotos";

export type VisitSeverity = "low" | "medium" | "high";

export type ParsedFieldNotes = {
  severity: VisitSeverity | null;
  fieldNotes: string;
};

export type VisitPatchBody = {
  observation?: string;
  field_notes?: string;
  recommendation?: string;
  action_taken?: string;
  general_advice?: string;
  next_visit_date?: string | null;
  follow_up_date?: string | null;
};

export function visitObservationText(visit: Visit): string {
  return visit.observation?.trim() || "";
}

export function visitRecommendationText(visit: Visit): string {
  const combined =
    visit.recommendation?.trim() ||
    visit.action_taken?.trim() ||
    visit.general_advice?.trim() ||
    "";
  if (combined) return combined;
  const parts = [
    visit.fertilizer_advice,
    visit.pesticide_advice,
    visit.irrigation_advice
  ]
    .map((row) => row?.trim())
    .filter(Boolean);
  return parts.join("\n");
}

export function parseFieldNotes(raw?: string | null): ParsedFieldNotes {
  const lines = (raw ?? "").split("\n");
  let severity: VisitSeverity | null = null;
  const notes: string[] = [];
  for (const line of lines) {
    const match = line.match(/^Severity:\s*(low|medium|high)\s*$/i);
    if (match) {
      severity = match[1].toLowerCase() as VisitSeverity;
      continue;
    }
    if (line.trim()) notes.push(line);
  }
  return { severity, fieldNotes: notes.join("\n").trim() };
}

/** Employee-facing Field Notes — merges legacy observation + recommendation for display. */
export function visitFieldNotesText(visit: Visit): string {
  const parsed = parseFieldNotes(visit.field_notes);
  const fromNotes = parsed.fieldNotes.trim();
  const observation = visit.observation?.trim() || "";
  const recommendation = visitRecommendationText(visit).trim();
  const parts = [fromNotes || observation, recommendation].filter(Boolean);
  // Deduplicate if observation was mirrored into field_notes historically.
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.some((row) => row === part)) unique.push(part);
  }
  return unique.join("\n\n").trim();
}

import { resolveMediaUrl } from "../../src/utils/resolveMediaUrl";
import {
  extractVisitGalleryMedia,
  visitHasCanonicalGallery
} from "../../src/utils/visitGalleryMedia.js";

export { resolveMediaUrl } from "../../src/utils/resolveMediaUrl";
export { extractVisitGalleryMedia, visitHasCanonicalGallery };

export function severityVariant(level: VisitSeverity): "green" | "amber" | "red" {
  if (level === "low") return "green";
  if (level === "high") return "red";
  return "amber";
}

export function severityLabel(level: VisitSeverity) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function inferSeverity(visit: Visit, parsed: ParsedFieldNotes): VisitSeverity {
  if (parsed.severity) return parsed.severity;
  if (visit.disease_issue) return "high";
  if (visit.pest_issue) return "medium";
  return "low";
}

export function followUpChipVariant(dateStr: string): "green" | "amber" | "red" {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "amber";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const follow = new Date(date);
  follow.setHours(0, 0, 0, 0);
  if (follow < today) return "red";
  if (follow.getTime() === today.getTime()) return "amber";
  return "green";
}

export function categoryTone(code?: string | null): { bg: string; text: string; icon: string } {
  const key = (code ?? "").toUpperCase();
  if (key.includes("PEST")) return { bg: "#fef3c7", text: "#92400e", icon: "bug-outline" };
  if (key.includes("DIS")) return { bg: "#fef2f2", text: "#991b1b", icon: "medkit-outline" };
  if (key.includes("NUT")) return { bg: "#eff6ff", text: "#1e40af", icon: "nutrition-outline" };
  if (key.includes("WAT")) return { bg: "#ecfeff", text: "#155e75", icon: "water-outline" };
  return { bg: "#f0faf3", text: "#1b4332", icon: "leaf-outline" };
}

export async function fetchVisitDetail(pk: number): Promise<Visit> {
  return getMobileVisit(pk);
}

export async function fetchVisitAttachments(
  pk: number,
  options?: { dedupe?: boolean }
): Promise<VisitAttachment[]> {
  const rows = await listVisitAttachments(pk, options);
  return rows.filter(isDisplayableVisitImage);
}

/** Gallery for Visit Detail: media_files / media.images, then legacy mobile attachments only if those keys are absent. */
export async function fetchVisitGallery(pk: number, visit?: Visit | null): Promise<VisitAttachment[]> {
  const row = visit ?? (await fetchVisitDetail(pk));
  if (visitHasCanonicalGallery(row)) {
    return extractVisitGalleryMedia(row);
  }
  return fetchVisitAttachments(pk, { dedupe: false }).catch(() => []);
}

export async function patchMobileVisit(pk: number, body: VisitPatchBody): Promise<Visit> {
  const payload: Record<string, unknown> = { ...body };
  if (body.next_visit_date !== undefined) {
    payload.follow_up_date = body.next_visit_date;
  }
  const data = await apiClient<Visit>(`mobile/visits/${pk}/`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return normalizeVisitFromApi(data);
}

async function postVisitMedia(
  visitId: number,
  photo: VisitPhotoAsset
): Promise<VisitAttachment | null> {
  // Mobile gallery upload — POST media/ first. Do not use the Admin attachments API.
  const paths = [`mobile/visits/${visitId}/media/`, `mobile/visits/${visitId}/attachments/`];
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      const token = await getAccessToken();
      const sessionHeaders = await getDeviceSessionHeaderEntries();
      const url = `${API_BASE_URL}${path}`;
      const formData = new FormData();
      formData.append("file", {
        uri: photo.uri,
        name: photo.name,
        type: photo.mimeType
      } as unknown as Blob);
      formData.append("attachment_type", "image");

      const created = await new Promise<VisitAttachment | null>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Accept", "application/json");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        for (const [key, value] of Object.entries(sessionHeaders)) {
          xhr.setRequestHeader(key, value);
        }
        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error("Upload failed"));
            return;
          }
          try {
            const parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            resolve(normalizeVisitAttachment(parsed));
          } catch {
            resolve(null);
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(formData);
      });
      return created;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Upload failed");
    }
  }
  if (lastError) {
    throw lastError;
  }
  return null;
}

/**
 * Upload visit photo and return the image list for immediate UI update.
 * Uses the create response first so a stale/deduped GET cannot blank the grid.
 */
export async function uploadVisitPhoto(pk: number, photo: VisitPhotoAsset) {
  const created = await postVisitMedia(pk, photo);
  const createdImage = isDisplayableVisitImage(created) ? created : null;

  let listed: VisitAttachment[] = [];
  try {
    listed = await fetchVisitGallery(pk);
  } catch {
    listed = [];
  }

  if (createdImage) {
    return mergeVisitAttachmentsById(listed, [createdImage]);
  }

  if (listed.length > 0) {
    return listed;
  }

  throw new Error(
    "Upload may have succeeded, but the photo is not available yet. Pull to refresh and try again."
  );
}

export async function removeVisitAttachment(pk: number, attachmentId: number) {
  await deleteVisitAttachment(pk, attachmentId);
}

export async function fetchFarmerVisitTimeline(farmerId: number, currentVisitId: number, limit = 3) {
  const visits = await getFarmerVisits(farmerId);
  return visits
    .filter((v) => v.id !== currentVisitId)
    .sort((a, b) => {
      const ta = new Date(a.visit_date || a.created_at || 0).getTime();
      const tb = new Date(b.visit_date || b.created_at || 0).getTime();
      return tb - ta;
    })
    .slice(0, limit);
}
