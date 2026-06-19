type TrackingLogEvent =
  | "foreground_permission"
  | "background_permission"
  | "task_registered"
  | "workday_started"
  | "tracking_task_started"
  | "tracking_started"
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
  | "task_error"
  | "expo_go_limited";

export function trackingDevLog(event: TrackingLogEvent, detail?: string) {
  if (!__DEV__) return;
  console.log(`[Tracking] ${event}${detail ? `: ${detail}` : ""}`);
}
