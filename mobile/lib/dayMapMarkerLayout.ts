import type { MapCoordinate } from "../../src/components/map/FieldMapView.types";

const COORD_BUCKET = 5; // ~1.1 m at equator for toFixed(5)
/** ~9–12 m fan so stacked pins remain tappable. */
const OFFSET_DEG = 0.00009;

/**
 * Spread markers that share near-identical coordinates so they stay readable.
 * Order is preserved; only lat/lng are nudged.
 */
export function spreadDuplicateMapCoordinates<T extends { lat: number; lng: number }>(
  markers: T[]
): T[] {
  if (markers.length < 2) return markers;

  const buckets = new Map<string, number[]>();
  markers.forEach((m, index) => {
    const key = `${m.lat.toFixed(COORD_BUCKET)},${m.lng.toFixed(COORD_BUCKET)}`;
    const list = buckets.get(key);
    if (list) list.push(index);
    else buckets.set(key, [index]);
  });

  const out = markers.map((m) => ({ ...m }));
  for (const indices of buckets.values()) {
    if (indices.length < 2) continue;
    indices.forEach((markerIndex, i) => {
      if (i === 0) return;
      const angle = (Math.PI * 2 * i) / indices.length;
      out[markerIndex] = {
        ...out[markerIndex],
        lat: out[markerIndex].lat + Math.sin(angle) * OFFSET_DEG * (1 + i * 0.15),
        lng: out[markerIndex].lng + Math.cos(angle) * OFFSET_DEG * (1 + i * 0.15)
      };
    });
  }
  return out;
}

export function coordsSignature(points: MapCoordinate[]): string {
  if (!points.length) return "empty";
  return points
    .map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`)
    .sort()
    .join("|");
}
