/** Clean distance labels — never null, undefined, NaN, or "--". */
export function formatDistanceTravelled(
  distanceKm: number | null | undefined,
  options?: { dutyActive?: boolean }
): string {
  if (distanceKm != null && Number.isFinite(distanceKm)) {
    return `${distanceKm.toFixed(1)} km`;
  }
  if (options?.dutyActive) return "Calculating…";
  return "0 km";
}

export function formatGpsStatusLabel(input: {
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
  dutyActive?: boolean;
}): string {
  if (input.permissionDenied) return "Unavailable";
  if (input.gpsEnabled) return "Active";
  if (input.dutyActive) return "Waiting";
  return "Unavailable";
}
