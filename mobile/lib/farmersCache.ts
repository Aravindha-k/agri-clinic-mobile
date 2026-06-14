import type { Farmer } from "../../src/api/farmers";
import { appStorage } from "./mmkv";

export const FARMERS_CACHE_KEY = "farmers_cache_v1";

export type FarmersCachePayload = {
  farmers: Farmer[];
  syncedAt: string;
  count: number;
};

export function readFarmersCache(): FarmersCachePayload | null {
  try {
    const raw = appStorage.getString(FARMERS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FarmersCachePayload;
  } catch {
    return null;
  }
}

export function writeFarmersCache(farmers: Farmer[]): FarmersCachePayload {
  const payload: FarmersCachePayload = {
    farmers,
    syncedAt: new Date().toISOString(),
    count: farmers.length
  };
  appStorage.set(FARMERS_CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export function getCachedFarmers(): Farmer[] {
  return readFarmersCache()?.farmers ?? [];
}
