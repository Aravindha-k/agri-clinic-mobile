import { useCallback, useState } from "react";
import type { WatermarkPreviewResult } from "../components/visit/VisitPhotoWatermarkPreview";
import type { VisitPhotoWatermarkMeta } from "../utils/visitPhotoWatermark";
import { prepareImageForUpload } from "../utils/visitAttachmentFiles";
import { createPendingAttachmentId, PendingVisitAttachment } from "../visit/pendingAttachments";

type PendingState = {
  imageUri: string;
  meta: VisitPhotoWatermarkMeta;
};

export function useVisitPhotoWithWatermark() {
  const [preview, setPreview] = useState<PendingState | null>(null);

  const openPreview = useCallback((imageUri: string, meta: VisitPhotoWatermarkMeta) => {
    setPreview({ imageUri, meta });
  }, []);

  const closePreview = useCallback(() => setPreview(null), []);

  const buildAttachment = useCallback(
    async (result: WatermarkPreviewResult): Promise<PendingVisitAttachment> => {
      const originalPrepared = await prepareImageForUpload(result.originalUri);
      const proofPrepared = await prepareImageForUpload(result.watermarkedUri);
      const stamp = Date.now();
      return {
        id: createPendingAttachmentId(),
        attachmentType: "image",
        uri: proofPrepared.uri,
        name: `visit-photo-proof-${stamp}.jpg`,
        mimeType: proofPrepared.mimeType,
        originalUri: originalPrepared.uri,
        originalName: `visit-photo-original-${stamp}.jpg`,
        originalMimeType: originalPrepared.mimeType,
        createdAt: new Date().toISOString()
      };
    },
    []
  );

  return {
    previewVisible: preview != null,
    previewImageUri: preview?.imageUri ?? null,
    previewMeta: preview?.meta ?? null,
    openPreview,
    closePreview,
    buildAttachment
  };
}
