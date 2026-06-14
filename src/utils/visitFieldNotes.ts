export const NOT_ADDED_BY_EMPLOYEE = "Not added by employee";

export function displayVisitField(value?: string | null): string {
  const text = (value ?? "").trim();
  return text || NOT_ADDED_BY_EMPLOYEE;
}

/** Map form values into backend observation / field notes columns. */
export function applyObservationPayload(
  payload: Record<string, unknown>,
  values: Record<string, unknown>
) {
  const observation = String(values.observation ?? values.field_notes ?? "").trim();
  const fieldNotes = String(values.field_notes ?? values.observation ?? values.notes ?? "").trim();
  const problemSeen = String(values.problem_seen ?? "").trim();
  const actionTaken = String(values.action_taken ?? "").trim();
  const followUpDate = String(values.follow_up_date ?? values.next_visit_date ?? "").trim();
  const cropName = String(values.crop_name ?? "").trim();

  if (fieldNotes) {
    payload.field_notes = fieldNotes;
  }
  if (observation || fieldNotes) {
    payload.observation = observation || fieldNotes;
  }
  if (problemSeen) {
    payload.problem_seen = problemSeen;
  }
  if (actionTaken) {
    payload.action_taken = actionTaken;
  }
  const recommendation = String(values.recommendation ?? "").trim();
  if (recommendation) {
    payload.recommendation = recommendation;
  }
  if (followUpDate) {
    payload.follow_up_date = followUpDate;
    payload.next_visit_date = followUpDate;
  }

  if (cropName) {
    payload.crop_name = cropName;
  }

  return payload;
}
