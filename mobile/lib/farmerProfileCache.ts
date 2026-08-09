import type { MobileFarmerProfile } from "./farmerProfileApi";
import { appStorage } from "./mmkv";

const PROFILE_CACHE_PREFIX = "farmer_profile_cache_v1:";
export const FARMER_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedFarmerProfile = {
  profile: MobileFarmerProfile;
  cachedAt: string;
};

function cacheKey(farmerId: number) {
  return `${PROFILE_CACHE_PREFIX}${farmerId}`;
}

export function readFarmerProfileCache(farmerId: number): MobileFarmerProfile | null {
  if (!Number.isFinite(farmerId) || farmerId <= 0) return null;
  try {
    const raw = appStorage.getString(cacheKey(farmerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFarmerProfile;
    if (!parsed?.profile?.farmer?.id) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

/** Fresh within TTL — safe to paint without waiting on network. */
export function readFreshFarmerProfileCache(
  farmerId: number,
  ttlMs = FARMER_PROFILE_CACHE_TTL_MS
): MobileFarmerProfile | null {
  if (!Number.isFinite(farmerId) || farmerId <= 0) return null;
  try {
    const raw = appStorage.getString(cacheKey(farmerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFarmerProfile;
    if (!parsed?.profile?.farmer?.id || !parsed.cachedAt) return null;
    const age = Date.now() - Date.parse(parsed.cachedAt);
    if (!Number.isFinite(age) || age < 0 || age > ttlMs) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

export function writeFarmerProfileCache(profile: MobileFarmerProfile): void {
  const id = Number(profile?.farmer?.id);
  if (!Number.isFinite(id) || id <= 0) return;
  try {
    const payload: CachedFarmerProfile = {
      profile,
      cachedAt: new Date().toISOString()
    };
    appStorage.set(cacheKey(id), JSON.stringify(payload));
  } catch {
    /* ignore cache write failures */
  }
}
