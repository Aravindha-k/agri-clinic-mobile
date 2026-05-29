import {
  LocalFilePayload,
  uploadVisitAttachmentFile,
  uploadVisitTextNote,
  VisitAttachmentType
} from "../api/visitAttachments";

export type PendingVisitAttachment = {
  id: string;
  attachmentType: VisitAttachmentType;
  uri?: string;
  name?: string;
  mimeType?: string;
  textContent?: string;
  createdAt: string;
};

export function createPendingAttachmentId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function pendingAttachmentLabel(item: PendingVisitAttachment) {
  if (item.attachmentType === "text") {
    return item.textContent?.slice(0, 40) || "Text note";
  }
  return item.name || "Attachment";
}

export async function uploadAllPendingAttachments(
  visitId: number,
  items: PendingVisitAttachment[],
  onProgress?: (index: number, total: number, label: string, fileProgress: number) => void
): Promise<{ uploaded: number; failed: string[] }> {
  const failed: string[] = [];
  let uploaded = 0;
  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = pendingAttachmentLabel(item);
    onProgress?.(i, total, label, 0);

    try {
      if (item.attachmentType === "text") {
        const text = item.textContent?.trim();
        if (!text) continue;
        await uploadVisitTextNote(visitId, text);
      } else if (item.uri && item.name && item.mimeType) {
        const file: LocalFilePayload = {
          uri: item.uri,
          name: item.name,
          mimeType: item.mimeType,
          attachmentType: item.attachmentType
        };
        await uploadVisitAttachmentFile(visitId, file, (p) => onProgress?.(i, total, label, p));
      } else {
        throw new Error("Invalid attachment");
      }
      uploaded += 1;
    } catch {
      failed.push(label);
    }
  }

  return { uploaded, failed };
}
