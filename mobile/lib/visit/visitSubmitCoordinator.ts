import { generateLocalSyncId } from "../sync/queueIds";
import { useVisitFormStore } from "../../store/visitFormStore";
import { beginNewVisit } from "../beginNewVisit";
import { enqueuePendingVisit } from "../pendingVisitsQueue";
import {
  buildVisitFormValuesFromStore,
  isOfflineSubmitError,
  submitVisitFromStore
} from "../visitSubmitApi";
import { getVisitDutyFields } from "../visitDutyContext";
import { hasValidGps } from "../../../src/visit/visitValidation";
import { buildSubmittedVisitSummary, type SubmittedVisitSummary } from "../../../src/types/submittedVisitSummary";
import {
  pendingAttachmentLabel,
  uploadAllPendingAttachments,
  type PendingVisitAttachment
} from "../../../src/visit/pendingAttachments";
import type { WorkdayStatus } from "../../../src/api/tracking";
import { ensureLocationReadyForVisit } from "../../../src/features/fieldTrackingSetup";
import { normalizeVisitSubmitUserMessage } from "../../../src/utils/visitSubmitErrors";

export type VisitSubmitProgress =
  | "idle"
  | "ensuring_duty"
  | "capturing_location"
  | "submitting"
  | "uploading_media"
  | "queueing"
  | "done";

export type VisitSubmitResult =
  | { ok: true; summary: SubmittedVisitSummary; mediaPending: boolean }
  | { ok: false; message: string; cancelled?: boolean };

type SubmitDeps = {
  online: boolean;
  currentDuty: WorkdayStatus | null;
  startDuty: () => Promise<WorkdayStatus | null>;
  refreshCurrentDuty: () => Promise<unknown>;
  refreshDutyMap: () => Promise<unknown>;
  bumpAfterVisitChange: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  onProgress?: (phase: VisitSubmitProgress) => void;
};

let submitInFlight: Promise<VisitSubmitResult> | null = null;

export function isVisitSubmitInFlight(): boolean {
  return submitInFlight != null;
}

/**
 * Single-flight visit submission coordinator.
 * Takes an immutable draft snapshot; never mutates the live draft mid-submit.
 */
export async function submitVisitCoordinator(deps: SubmitDeps): Promise<VisitSubmitResult> {
  if (submitInFlight) return submitInFlight;

  submitInFlight = (async () => {
    const {
      online,
      currentDuty,
      startDuty,
      refreshCurrentDuty,
      bumpAfterVisitChange,
      t,
      onProgress
    } = deps;

    try {
      onProgress?.("ensuring_duty");
      if (!currentDuty?.is_active) {
        const started = await startDuty();
        if (!started) {
          return { ok: false, message: t("visitFlow.workdayFirstBody") };
        }
      }

      const allowed = await ensureLocationReadyForVisit();
      if (!allowed.ok) {
        return { ok: false, message: allowed.message, cancelled: true };
      }

      const draft = useVisitFormStore.getState();
      const localSyncId = draft.submissionLocalSyncId ?? generateLocalSyncId();
      if (!draft.submissionLocalSyncId) {
        useVisitFormStore.getState().setSubmissionLocalSyncId(localSyncId);
      }

      onProgress?.("capturing_location");
      // Hard timeout — OEM GPS can hang indefinitely and freeze the submit spinner.
      // Never requests OS permission — Field Tracking Setup owns requests.
      const { captureVisitGps, visitGpsIsUsable } = await import("./visitGpsCapture");
      const gpsCapture = await captureVisitGps({ requestPermission: false });
      if (!gpsCapture.ok) {
        return {
          ok: false,
          message: gpsCapture.message || t("visitFlow.gpsNotCaptured")
        };
      }

      const { latitude, longitude, accuracy, capturedAt: capturedIso } = gpsCapture.coords;
      const capturedAt = new Date(capturedIso);
      const duty = await getVisitDutyFields();
      const capturedExtras = {
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        capturedAt,
        duty
      };

      // Snapshot after GPS so payload includes coords; do not keep mutating during network I/O.
      useVisitFormStore.getState().setGpsCoords({
        latitude,
        longitude,
        accuracy: accuracy ?? null
      });
      useVisitFormStore.getState().setVisitedAt(capturedAt.toISOString());

      const snapshot = useVisitFormStore.getState();
      const values = buildVisitFormValuesFromStore(snapshot, localSyncId, capturedExtras);

      if (!hasValidGps(values) || !visitGpsIsUsable({ latitude, longitude, accuracy })) {
        return { ok: false, message: t("visitFlow.gpsNotCaptured") };
      }

      // eslint-disable-next-line no-console
      console.log("[VisitGPS] submit_location_validated", { accuracy });

      const gpsConfirmed = accuracy != null && Number.isFinite(accuracy) && accuracy <= 100;

      if (!online) {
        onProgress?.("queueing");
        await enqueuePendingVisit(
          {
            id: localSyncId,
            local_sync_id: localSyncId,
            createdAt: new Date().toISOString(),
            values,
            photos: snapshot.photos,
            status: "pending",
            attempts: 0
          },
          snapshot.extraAttachments,
          snapshot.pendingFarmerPhoto
        );
        bumpAfterVisitChange();
        const summary = buildSubmittedVisitSummary({
          visitId: 0,
          queued: true,
          queueId: localSyncId,
          farmerName: values.farmer_name,
          cropName: snapshot.cropName,
          problemText: values.problem_seen,
          fieldNotesText: values.observation || values.field_notes,
          gpsConfirmed: hasValidGps(values),
          submittedAt: values.captured_at ?? new Date().toISOString()
        });
        beginNewVisit();
        const { emitVisitDataRefresh } = await import("./visitDataRefresh");
        emitVisitDataRefresh();
        onProgress?.("done");
        return { ok: true, summary, mediaPending: false };
      }

      try {
        onProgress?.("submitting");
        const { visit, evidenceFailed } = await submitVisitFromStore(snapshot, localSyncId, capturedExtras);

        onProgress?.("uploading_media");
        const failedExtras: PendingVisitAttachment[] = [];
        for (const attachment of snapshot.extraAttachments) {
          const result = await uploadAllPendingAttachments(visit.id, [attachment]);
          if (result.failed.length) failedExtras.push(attachment);
        }

        const failedPhotoNames = new Set(evidenceFailed);
        const failedAttachments: PendingVisitAttachment[] = [
          ...snapshot.photos
            .filter((photo) => failedPhotoNames.has(photo.name))
            .map((photo) => ({
              id: photo.id,
              attachmentType: "image" as const,
              uri: photo.uri,
              name: photo.name,
              mimeType: photo.mimeType,
              createdAt: new Date().toISOString()
            })),
          ...failedExtras
        ];

        let mediaPending = false;
        let evidenceWarning: string | undefined;
        if (failedAttachments.length) {
          mediaPending = true;
          const { enqueueFailedVisitEvidence } = await import("../sync/pendingEvidenceQueue");
          await enqueueFailedVisitEvidence({
            visitId: visit.id,
            attachments: failedAttachments,
            localSyncId
          });
          evidenceWarning = t("visitFlow.uploadsQueuedForRetry", {
            files: failedAttachments.map(pendingAttachmentLabel).join(", ")
          });
        }

        await Promise.all([
          refreshCurrentDuty().catch(() => undefined)
        ]);
        bumpAfterVisitChange();

        const summary = buildSubmittedVisitSummary({
          visitId: visit.id,
          queued: false,
          farmerName: values.farmer_name,
          cropName: snapshot.cropName,
          problemText: values.problem_seen,
          fieldNotesText: values.observation || values.field_notes,
          gpsConfirmed,
          submittedAt: capturedAt.toISOString(),
          evidenceWarning
        });
        beginNewVisit();
        const { emitVisitDataRefresh } = await import("./visitDataRefresh");
        emitVisitDataRefresh();
        onProgress?.("done");
        return { ok: true, summary, mediaPending };
      } catch (err) {
        if (!isOfflineSubmitError(err) && (err as Error)?.message !== "offline") {
          return {
            ok: false,
            message: normalizeVisitSubmitUserMessage(err, {
              fallback: t("visitFlow.submitFailed")
            })
          };
        }

        onProgress?.("queueing");
        const latest = useVisitFormStore.getState();
        const offlineDuty = capturedExtras.duty ?? (await getVisitDutyFields());
        const offlineValues = buildVisitFormValuesFromStore(latest, localSyncId, {
          ...capturedExtras,
          duty: offlineDuty
        });

        await enqueuePendingVisit(
          {
            id: localSyncId,
            local_sync_id: localSyncId,
            createdAt: new Date().toISOString(),
            values: offlineValues,
            photos: latest.photos,
            status: "pending",
            attempts: 0
          },
          latest.extraAttachments,
          latest.pendingFarmerPhoto
        );

        bumpAfterVisitChange();
        const summary = buildSubmittedVisitSummary({
          visitId: 0,
          queued: true,
          queueId: localSyncId,
          farmerName: offlineValues.farmer_name,
          cropName: latest.cropName,
          problemText: offlineValues.problem_seen,
          fieldNotesText: offlineValues.observation || offlineValues.field_notes,
          gpsConfirmed: hasValidGps(offlineValues),
          submittedAt: offlineValues.captured_at ?? new Date().toISOString()
        });
        beginNewVisit();
        const { emitVisitDataRefresh } = await import("./visitDataRefresh");
        emitVisitDataRefresh();
        onProgress?.("done");
        return { ok: true, summary, mediaPending: false };
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : t("visitFlow.submitFailed")
      };
    } finally {
      submitInFlight = null;
    }
  })();

  return submitInFlight;
}
