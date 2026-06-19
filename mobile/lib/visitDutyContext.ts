import { getActiveDutySessionId, getActiveWorkdayId } from "../../src/storage/workdaySessionStorage";

export type VisitDutyFields = {
  duty_session_id?: number;
  workday_id?: number;
};

/** Active duty session ids for visit submit — links visit to day report. */
export async function getVisitDutyFields(): Promise<VisitDutyFields> {
  const [dutySessionId, workdayId] = await Promise.all([
    getActiveDutySessionId(),
    getActiveWorkdayId()
  ]);

  const fields: VisitDutyFields = {};
  if (dutySessionId != null && dutySessionId > 0) {
    fields.duty_session_id = dutySessionId;
  }
  if (workdayId != null && workdayId > 0) {
    fields.workday_id = workdayId;
  }
  return fields;
}

export function visitCaptureTimestamps(capturedAt = new Date()) {
  const iso = capturedAt.toISOString();
  return {
    captured_at: iso,
    visit_date: iso.slice(0, 10),
    visit_time: iso.slice(11, 19)
  };
}
