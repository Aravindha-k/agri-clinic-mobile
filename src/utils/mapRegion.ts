import { Region } from "react-native-maps";
import { hasValidMapCoords } from "./mapCoords";

export const DEFAULT_MAP_REGION: Region = {
  latitude: 11.1271,
  longitude: 78.6569,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

export function sanitizeRegion(region: Region): Region {
  const lat = Number(region.latitude);
  const lng = Number(region.longitude);
  const latDelta = Number(region.latitudeDelta);
  const lngDelta = Number(region.longitudeDelta);

  if (!hasValidMapCoords(lat, lng)) {
    return { ...DEFAULT_MAP_REGION };
  }

  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: Number.isFinite(latDelta) && latDelta > 0 ? latDelta : 0.05,
    longitudeDelta: Number.isFinite(lngDelta) && lngDelta > 0 ? lngDelta : 0.05
  };
}

export function fitMapRegion(points: { lat: number; lng: number }[], fallback?: Region): Region {
  const valid = points.filter((p) => hasValidMapCoords(p.lat, p.lng));
  if (!valid.length) {
    return sanitizeRegion(fallback ?? DEFAULT_MAP_REGION);
  }
  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latDelta = Math.max((maxLat - minLat) * 1.6, 0.012);
  const lngDelta = Math.max((maxLng - minLng) * 1.6, 0.012);
  return sanitizeRegion({
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta
  });
}
