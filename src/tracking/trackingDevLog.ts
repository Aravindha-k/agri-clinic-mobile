type TrackingLogEvent =
  | "foreground_permission"
  | "background_permission"
  | "task_registered"
  | "workday_started"
  | "tracking_task_started"
  | "tracking_started"
  | "tracking_background"
  | "tracking_resume"
  | "tracking_queue_flush"
  | "tracking_stopped"
  | "tracking_already_started"
  | "location_received"
  | "distance_from_previous"
  | "skipped_reason"
  | "sent_to_backend"
  | "queued_offline"
  | "location_post_success"
  | "location_post_failed"
  | "queued_location_count"
  | "offline_flush"
  | "offline_flush_failed"
  | "duty_session_mismatch"
  | "task_error"
  | "expo_go_limited"
  | "tracking_deferred_auth_not_ready"
  | "tracking_deferred_permission_missing"
  | "tracking_stopped_permission_revoked"
  | "duty_start_gps_confirm"
  | "resumed_after_auth";

/**
 * Structured tracking lifecycle logs.
 * Always emit checklist events in DEV; critical stop/start also in release via console.log.
 */
const ALWAYS_EMIT = new Set<TrackingLogEvent>([
  "tracking_started",
  "tracking_background",
  "tracking_resume",
  "tracking_queue_flush",
  "tracking_stopped",
  "tracking_deferred_permission_missing",
  "tracking_stopped_permission_revoked"
]);

export function trackingDevLog(event: TrackingLogEvent, detail?: string) {
  if (!__DEV__ && !ALWAYS_EMIT.has(event)) return;
  // eslint-disable-next-line no-console
  console.log(`[Tracking] ${event}${detail ? `: ${detail}` : ""}`);
}
