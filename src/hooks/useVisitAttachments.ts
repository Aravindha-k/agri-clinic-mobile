import { useCallback, useState } from "react";
import {
  deleteVisitAttachment,
  listVisitAttachments,
  LocalFilePayload,
  uploadVisitAttachmentFile,
  uploadVisitTextNote,
  VisitAttachment
} from "../api/visitAttachments";
import { friendlyUploadError } from "../utils/visitAttachmentFiles";

type UploadState = {
  progress: number;
  label: string;
};

export function useVisitAttachments(visitId: number | null | undefined) {
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<UploadState | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canManage = Boolean(visitId && visitId > 0);

  const refresh = useCallback(async () => {
    if (!visitId || visitId <= 0) {
      setAttachments([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await listVisitAttachments(visitId);
      setAttachments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load attachments.");
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  const uploadFile = useCallback(
    async (file: LocalFilePayload) => {
      if (!visitId || visitId <= 0) return;
      setUploading({ progress: 0, label: file.name });
      setError("");
      try {
        const created = await uploadVisitAttachmentFile(visitId, file, (p) =>
          setUploading({ progress: p, label: file.name })
        );
        setAttachments((prev) => [created, ...prev]);
      } catch (err) {
        setError(friendlyUploadError(err));
        throw err;
      } finally {
        setUploading(null);
      }
    },
    [visitId]
  );

  const uploadText = useCallback(
    async (text: string) => {
      if (!visitId || visitId <= 0) return;
      setUploading({ progress: 0.5, label: "Text note" });
      setError("");
      try {
        const created = await uploadVisitTextNote(visitId, text);
        setAttachments((prev) => [created, ...prev]);
      } catch (err) {
        setError(friendlyUploadError(err));
        throw err;
      } finally {
        setUploading(null);
      }
    },
    [visitId]
  );

  const remove = useCallback(
    async (attachmentId: number) => {
      if (!visitId || visitId <= 0) return;
      setDeletingId(attachmentId);
      setError("");
      try {
        await deleteVisitAttachment(visitId, attachmentId);
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to delete attachment.");
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    [visitId]
  );

  return {
    attachments,
    loading,
    error,
    uploading,
    deletingId,
    canManage,
    refresh,
    uploadFile,
    uploadText,
    remove,
    setError
  };
}
