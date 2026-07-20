import {
  ROUTE_STOPPED_INTERVAL_MS,
  ROUTE_STOPPED_KEEPALIVE_MS
} from "../tracking/trackingConfig";

/**
 * Canonical tracking-health timing for active workdays.
 * Network offline alone must not trigger GPS-off / block.
 */

/** Probe cadence while a workday is active. */
export const TRACKING_HEALTH_PROBE_MS = 15_000;

/**
 * Soft warning: delayed reading beyond ~2 stopped intervals.
 * Does not block field work by itself.
 */
export const TRACKING_STALE_WARNING_MS = ROUTE_STOPPED_INTERVAL_MS * 2;

/**
 * Block threshold while app is foregrounded: no valid capture beyond
 * ~3 keepalive windows (permission + GPS may still look "on").
 */
export const TRACKING_STALE_BLOCK_MS = ROUTE_STOPPED_KEEPALIVE_MS * 3;

export const TRACKING_HEALTH_COPY = {
  title: "Location is required while your workday is active.",
  subtitle: "Turn on location to continue field tracking.",
  permissionPermanent: "Location permission is disabled for this app.",
  notificationTitle: "Location tracking stopped",
  notificationBody: "Turn on location to continue your active workday."
} as const;
