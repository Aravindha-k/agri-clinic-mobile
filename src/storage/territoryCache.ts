import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TerritoryVillage } from "../api/territory";

/** Versioned key — old district/taluk territory caches must not be read. */
export const TERRITORY_CACHE_KEY_PREFIX = "@agri/territory_villages_v1:user_";
/** Pre-user-scoped key — always rejected/cleared on read. */
export const LEGACY_UNSCOPED_TERRITORY_CACHE_KEY = "@agri/territory_villages_v1";
export const TERRITORY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export type TerritoryCacheSnapshot = {
  version: 1;
  userId: number;
  syncedAt: string;
  villages: TerritoryVillage[];
};

function cacheKeyForUser(userId: number): string {
  return `${TERRITORY_CACHE_KEY_PREFIX}${userId}`;
}

function isValidSnapshot(raw: unknown, expectedUserId: number): raw is TerritoryCacheSnapshot {
  if (!raw || typeof raw !== "object") return false;
  const row = raw as Record<string, unknown>;
  if (row.version !== 1) return false;
  if (typeof row.syncedAt !== "string" || !row.syncedAt) return false;
  if (!Array.isArray(row.villages)) return false;
  if (Number(row.userId) !== expectedUserId) return false;
  return true;
}

function filterVillages(villages: unknown[]): TerritoryVillage[] {
  return villages.filter(
    (v): v is TerritoryVillage =>
      Boolean(v) &&
      typeof v === "object" &&
      Number.isFinite(Number((v as TerritoryVillage).id)) &&
      String((v as TerritoryVillage).name || "").trim() !== ""
  );
}

export async function readTerritoryCache(
  userId: number | null | undefined
): Promise<TerritoryCacheSnapshot | null> {
  if (userId == null || !Number.isFinite(userId) || userId <= 0) {
    return null;
  }
  try {
    // Never use the legacy unscoped cache as a fallback.
    await AsyncStorage.removeItem(LEGACY_UNSCOPED_TERRITORY_CACHE_KEY).catch(() => undefined);

    const raw = await AsyncStorage.getItem(cacheKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSnapshot(parsed, userId)) {
      await AsyncStorage.removeItem(cacheKeyForUser(userId)).catch(() => undefined);
      return null;
    }
    return {
      version: 1,
      userId,
      syncedAt: parsed.syncedAt,
      villages: filterVillages(parsed.villages)
    };
  } catch {
    return null;
  }
}

export async function writeTerritoryCache(
  userId: number,
  villages: TerritoryVillage[]
): Promise<TerritoryCacheSnapshot> {
  const snapshot: TerritoryCacheSnapshot = {
    version: 1,
    userId,
    syncedAt: new Date().toISOString(),
    villages
  };
  await AsyncStorage.setItem(cacheKeyForUser(userId), JSON.stringify(snapshot));
  await AsyncStorage.removeItem(LEGACY_UNSCOPED_TERRITORY_CACHE_KEY).catch(() => undefined);
  return snapshot;
}

/** Clear one user's cache, or all territory caches on logout. */
export async function clearTerritoryCache(userId?: number | null): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_UNSCOPED_TERRITORY_CACHE_KEY).catch(() => undefined);
  if (userId != null && Number.isFinite(userId) && userId > 0) {
    await AsyncStorage.removeItem(cacheKeyForUser(userId)).catch(() => undefined);
    return;
  }
  try {
    const keys = await AsyncStorage.getAllKeys();
    const territoryKeys = keys.filter(
      (key) => key === LEGACY_UNSCOPED_TERRITORY_CACHE_KEY || key.startsWith(TERRITORY_CACHE_KEY_PREFIX)
    );
    if (territoryKeys.length) {
      await AsyncStorage.multiRemove(territoryKeys);
    }
  } catch {
    // best-effort
  }
}

export function isTerritoryCacheFresh(syncedAt: string | null | undefined): boolean {
  if (!syncedAt) return false;
  const t = new Date(syncedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < TERRITORY_CACHE_TTL_MS;
}
