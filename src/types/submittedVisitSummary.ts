/** Immutable summary for the visit success screen — not sourced from the editable draft. */
export type SubmittedVisitSummary = {
  visitId: number;
  queued: boolean;
  queueId?: string;
  farmerName?: string;
  cropName?: string;
  problemText?: string;
  /** Canonical Field Notes shown on success (legacy observation/recommendation folded in). */
  fieldNotesText?: string;
  /** @deprecated Prefer fieldNotesText */
  observationText?: string;
  /** @deprecated Prefer fieldNotesText */
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
  fieldNotesText?: string;
  observationText?: string;
  recommendationText?: string;
  gpsConfirmed?: boolean;
  submittedAt?: string;
  evidenceWarning?: string;
}): SubmittedVisitSummary {
  const fieldNotesText =
    input.fieldNotesText?.trim() ||
    [input.observationText, input.recommendationText].filter((row) => row?.trim()).join("\n\n").trim() ||
    undefined;
  return {
    visitId: input.visitId,
    queued: input.queued,
    queueId: input.queueId,
    farmerName: input.farmerName,
    cropName: input.cropName,
    problemText: input.problemText,
    fieldNotesText,
    observationText: input.observationText,
    recommendationText: input.recommendationText,
    gpsStatus: input.gpsConfirmed ? "captured" : input.queued ? "pending" : "unavailable",
    syncStatus: input.queued ? "queued" : "submitted",
    submittedAt: input.submittedAt,
    evidenceWarning: input.evidenceWarning
  };
}
