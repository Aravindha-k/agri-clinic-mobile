/**
 * Short-lived in-memory GPS reuse for the same user action.
 * Never persists. Never fabricates coordinates.
 */
import type * as Location from "expo-location";
import { hasValidMapCoords } from "./mapCoords";

/** Reuse a just-captured fix across Start Work Day → tracking startup. */
export const TRACKING_LOCATION_REUSE_MS = 20_000;
/** Visit review GPS may be reused on submit within this window. */
export const VISIT_LOCATION_REUSE_MS = 90_000;
/** Location-ready probe cache after a successful gate. */
export const LOCATION_READY_REUSE_MS = 8_000;

let cachedFix: { location: Location.LocationObject; at: number } | null = null;
let lastReadyAt = 0;

export function rememberFreshLocation(location: Location.LocationObject): void {
  const { latitude, longitude } = location.coords;
  if (!hasValidMapCoords(latitude, longitude)) return;
  cachedFix = { location, at: Date.now() };
}

export function peekFreshLocation(maxAgeMs: number): Location.LocationObject | null {
  if (!cachedFix) return null;
  const age = Date.now() - cachedFix.at;
  if (age < 0 || age > maxAgeMs) return null;
  const { latitude, longitude } = cachedFix.location.coords;
  if (!hasValidMapCoords(latitude, longitude)) return null;
  return cachedFix.location;
}

export function markLocationReadyNow(): void {
  lastReadyAt = Date.now();
}

export function wasLocationReadyRecently(maxAgeMs = LOCATION_READY_REUSE_MS): boolean {
  return lastReadyAt > 0 && Date.now() - lastReadyAt < maxAgeMs;
}
