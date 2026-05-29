/** Great-circle distance in kilometres (haversine). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

export function formatDistanceAway(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    return "";
  }
  if (km < 1) {
    return `${Math.max(1, Math.round(km * 1000))} m away`;
  }
  return `${km.toFixed(1)} km away`;
}
