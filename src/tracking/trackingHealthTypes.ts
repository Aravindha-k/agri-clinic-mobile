export type TrackingHealth =
  | { status: "idle" }
  | { status: "healthy"; lastLocationAt: string }
  | { status: "permission_required" }
  | { status: "permission_permanently_denied" }
  | { status: "services_disabled" }
  | { status: "tracking_stopped" }
  | { status: "location_stale"; lastLocationAt?: string }
  | { status: "recovering" };

export type TrackingHealthStatus = TrackingHealth["status"];

export function isTrackingHealthBlocking(health: TrackingHealth): boolean {
  switch (health.status) {
    case "permission_required":
    case "permission_permanently_denied":
    case "services_disabled":
    case "tracking_stopped":
    case "location_stale":
      return true;
    default:
      return false;
  }
}

export function trackingHealthPrimaryAction(
  health: TrackingHealth
): "allow_location" | "turn_on_location" | "resume_tracking" | "check_again" | "open_settings" | null {
  switch (health.status) {
    case "permission_permanently_denied":
      return "open_settings";
    case "permission_required":
      return "allow_location";
    case "services_disabled":
      return "turn_on_location";
    case "tracking_stopped":
      return "resume_tracking";
    case "location_stale":
      return "check_again";
    default:
      return null;
  }
}
