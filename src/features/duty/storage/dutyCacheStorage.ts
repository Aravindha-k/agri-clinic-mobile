import * as SecureStore from "expo-secure-store";
import type { DutyMapSummary, DutyStateSnapshot, MobileBootstrap } from "../types/duty";
import type { WorkdayStatus } from "../../../api/tracking";

const DUTY_CACHE_PREFIX = "agri_duty_bootstrap_v1_u";

type CachedDutyState = {
  userId: number;
  currentDuty: WorkdayStatus | null;
  dutyMap: DutyMapSummary | null;
  serverTimeOffsetMs: number;
  lastSyncedAt: string | null;
  cachedAt: string;
};

function cacheKeyForUser(userId: number) {
  return `${DUTY_CACHE_PREFIX}${userId}`;
}

function normalizeCachedState(raw: string | null, userId: number): CachedDutyState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedDutyState>;
    if (parsed.userId !== userId) {
      return null;
    }
    return {
      userId,
      currentDuty: (parsed.currentDuty as WorkdayStatus | null | undefined) ?? null,
      dutyMap: (parsed.dutyMap as DutyMapSummary | null | undefined) ?? null,
      serverTimeOffsetMs:
        typeof parsed.serverTimeOffsetMs === "number" && Number.isFinite(parsed.serverTimeOffsetMs)
          ? parsed.serverTimeOffsetMs
          : 0,
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
      cachedAt:
        typeof parsed.cachedAt === "string" && parsed.cachedAt.trim()
          ? parsed.cachedAt
          : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export async function readCachedDutyState(userId: number | null | undefined): Promise<CachedDutyState | null> {
  if (userId == null || !Number.isFinite(userId) || userId <= 0) {
    return null;
  }
  try {
    const raw = await SecureStore.getItemAsync(cacheKeyForUser(userId));
    return normalizeCachedState(raw, userId);
  } catch {
    return null;
  }
}

export async function writeCachedDutyBootstrap(
  userId: number,
  bootstrap: Pick<MobileBootstrap, "currentDuty" | "dutyMap" | "serverTimeOffsetMs">
): Promise<void> {
  const payload: CachedDutyState = {
    userId,
    currentDuty: bootstrap.currentDuty,
    dutyMap: bootstrap.dutyMap,
    serverTimeOffsetMs: bootstrap.serverTimeOffsetMs,
    lastSyncedAt: new Date().toISOString(),
    cachedAt: new Date().toISOString()
  };
  await SecureStore.setItemAsync(cacheKeyForUser(userId), JSON.stringify(payload));
}

export async function clearCachedDutyState(userId: number | null | undefined): Promise<void> {
  if (userId == null || !Number.isFinite(userId) || userId <= 0) {
    return;
  }
  await SecureStore.deleteItemAsync(cacheKeyForUser(userId)).catch(() => undefined);
}

export function toOfflineDutySnapshot(cached: CachedDutyState): DutyStateSnapshot {
  return {
    hydrationStatus: "ready",
    currentDuty: cached.currentDuty,
    dutyMap: cached.dutyMap,
    serverTimeOffsetMs: cached.serverTimeOffsetMs,
    isOffline: true,
    lastSyncedAt: cached.lastSyncedAt ?? cached.cachedAt,
    syncStatus: "offline",
    bootstrapError: null
  };
}
