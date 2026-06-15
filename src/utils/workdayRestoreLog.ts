export type WorkdayRestoreLogEvent =
  | "app_start_restore_local_workday"
  | "workday_timer_started"
  | "workday_current_api_start"
  | "workday_current_api_success"
  | "workday_current_api_failed"
  | "using_cached_workday"
  | "cleared_stale_workday";

/** Production-safe workday restore diagnostics (console.log). */
export function workdayRestoreLog(event: WorkdayRestoreLogEvent, detail?: string) {
  console.log(`[WorkdayRestore] ${event}${detail ? `: ${detail}` : ""}`);
}
