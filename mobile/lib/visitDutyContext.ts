import { getActiveDutySessionId, getActiveWorkdayId } from "../../src/storage/workdaySessionStorage";
import { indiaCalendarDate } from "../../src/utils/indiaDateTime";
import { BUSINESS_TIME_ZONE } from "../../src/utils/workdayCalendar";

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

/** Visit capture timestamps in Asia/Kolkata business calendar (not UTC slices). */
export function visitCaptureTimestamps(capturedAt = new Date()) {
  const iso = capturedAt.toISOString();
  const visitDate = indiaCalendarDate(capturedAt) ?? iso.slice(0, 10);
  const visitTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })
    .format(capturedAt)
    .replace(/\./g, ":");
  return {
    captured_at: iso,
    visit_date: visitDate,
    visit_time: visitTime
  };
}
