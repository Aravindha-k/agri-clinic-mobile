/** Immutable summary for the visit success screen — not sourced from the editable draft. */
export type SubmittedVisitSummary = {
  visitId: number;
  queued: boolean;
  queueId?: string;
  farmerName?: string;
  cropName?: string;
  problemText?: string;
  observationText?: string;
  recommendationText?: string;
  gpsStatus: "captured" | "pending" | "unavailable";
  syncStatus: "submitted" | "queued";
  submittedAt?: string;
  evidenceWarning?: string;
};

export function buildSubmittedVisitSummary(input: {
  visitId: number;
  queued: boolean;
  queueId?: string;
  farmerName?: string;
  cropName?: string;
  problemText?: string;
  observationText?: string;
  recommendationText?: string;
  gpsConfirmed?: boolean;
  submittedAt?: string;
  evidenceWarning?: string;
}): SubmittedVisitSummary {
  return {
    visitId: input.visitId,
    queued: input.queued,
    queueId: input.queueId,
    farmerName: input.farmerName,
    cropName: input.cropName,
    problemText: input.problemText,
    observationText: input.observationText,
    recommendationText: input.recommendationText,
    gpsStatus: input.gpsConfirmed ? "captured" : input.queued ? "pending" : "unavailable",
    syncStatus: input.queued ? "queued" : "submitted",
    submittedAt: input.submittedAt,
    evidenceWarning: input.evidenceWarning
  };
}
