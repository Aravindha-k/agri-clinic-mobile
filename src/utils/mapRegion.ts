import type { MapRegion } from "../types/map";
import { hasValidMapCoords } from "./mapCoords";

export type { MapRegion };

export const DEFAULT_MAP_REGION: MapRegion = {
  latitude: 11.1271,
  longitude: 78.6569,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

/** Street-level framing for a single field pin. */
export const SINGLE_POINT_MAP_DELTA = 0.014;

export function sanitizeRegion(region: MapRegion): MapRegion {
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

export function fitMapRegion(points: { lat: number; lng: number }[], fallback?: MapRegion): MapRegion {
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

type FitFieldOptions = {
  /** Extra space around markers (1.0 = tight). */
  padding?: number;
  minDelta?: number;
  /** Caps runaway zoom-out from noisy GPS trails. */
  maxDelta?: number;
};

/**
 * Field-day framing: tighter single-point zoom, modest padding, max delta cap
 * so dense GPS jitter does not pull the camera to district scale.
 */
export function fitFieldMapRegion(
  points: { lat: number; lng: number }[],
  fallback?: MapRegion,
  options?: FitFieldOptions
): MapRegion {
  const padding = options?.padding ?? 1.35;
  const minDelta = options?.minDelta ?? 0.01;
  const maxDelta = options?.maxDelta ?? 0.1;
  const valid = points.filter((p) => hasValidMapCoords(p.lat, p.lng));
  if (!valid.length) {
    return sanitizeRegion(fallback ?? DEFAULT_MAP_REGION);
  }
  if (valid.length === 1) {
    return sanitizeRegion({
      latitude: valid[0].lat,
      longitude: valid[0].lng,
      latitudeDelta: SINGLE_POINT_MAP_DELTA,
      longitudeDelta: SINGLE_POINT_MAP_DELTA
    });
  }

  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latDelta = Math.min(Math.max((maxLat - minLat) * padding, minDelta), maxDelta);
  const lngDelta = Math.min(Math.max((maxLng - minLng) * padding, minDelta), maxDelta);
  return sanitizeRegion({
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta
  });
}

/** Keep route look without stuffing every GPS sample into camera fit. */
export function sampleRouteForFit(
  points: { latitude: number; longitude: number }[],
  maxSamples = 8
): { lat: number; lng: number }[] {
  const valid = points.filter((p) => hasValidMapCoords(p.latitude, p.longitude));
  if (!valid.length) return [];
  if (valid.length <= maxSamples) {
    return valid.map((p) => ({ lat: p.latitude, lng: p.longitude }));
  }
  const out: { lat: number; lng: number }[] = [];
  const last = valid.length - 1;
  for (let i = 0; i < maxSamples; i++) {
    const idx = Math.round((i / (maxSamples - 1)) * last);
    const p = valid[idx];
    out.push({ lat: p.latitude, lng: p.longitude });
  }
  return out;
}
