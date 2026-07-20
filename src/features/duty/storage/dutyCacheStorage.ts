import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { DutyMapSummary, DutyStateSnapshot, MobileBootstrap } from "../types/duty";
import type { WorkdayStatus } from "../../../api/tracking";
import {
  getCanonicalWorkDateFromServerNow,
  reconcileDutyForCanonicalDay,
  resolveDutyWorkDate
} from "../../../utils/workdayCalendar";

const DUTY_CACHE_PREFIX = "agri_duty_bootstrap_v2_u";
/** Legacy SecureStore key — often >2048 bytes when dutyMap is included. */
const LEGACY_SECURE_PREFIX = "agri_duty_bootstrap_v1_u";

type CachedDutyState = {
  schemaVersion: 2;
  userId: number;
  /** Asia/Kolkata business date this snapshot belongs to. */
  canonicalDate: string | null;
  currentDuty: WorkdayStatus | null;
  /** Map is large — stored in AsyncStorage only; never SecureStore. */
  dutyMap: DutyMapSummary | null;
  serverTimeOffsetMs: number;
  lastSyncedAt: string | null;
  cachedAt: string;
};

function cacheKeyForUser(userId: number) {
  return `${DUTY_CACHE_PREFIX}${userId}`;
}

function legacySecureKey(userId: number) {
  return `${LEGACY_SECURE_PREFIX}${userId}`;
}

function emptyMapForToday(): DutyMapSummary {
  return {
    routePoints: [],
    visitMarkers: [],
    bounds: [],
    startMarker: null,
    endMarker: null,
    currentLiveLocation: null
  };
}

/**
 * Drop completed duties / maps that belong to a previous business day.
 */
export function sanitizeCachedDutyForToday(
  cached: CachedDutyState,
  canonicalDate: string
): CachedDutyState | null {
  if (cached.userId <= 0) return null;

  const duty = reconcileDutyForCanonicalDay(cached.currentDuty, canonicalDate);
  const cachedDate = cached.canonicalDate ?? resolveDutyWorkDate(cached.currentDuty);

  if (cachedDate && cachedDate !== canonicalDate && !duty?.is_active) {
    return {
      ...cached,
      canonicalDate,
      currentDuty: null,
      dutyMap: emptyMapForToday()
    };
  }

  if (!duty) {
    return {
      ...cached,
      canonicalDate,
      currentDuty: null,
      dutyMap: emptyMapForToday()
    };
  }

  const mapDutyId = cached.dutyMap?.dutyId;
  const dutySessionId = duty.duty_session_id;
  if (
    mapDutyId != null &&
    dutySessionId != null &&
    mapDutyId !== dutySessionId &&
    !duty.is_active
  ) {
    return {
      ...cached,
      canonicalDate,
      currentDuty: duty,
      dutyMap: emptyMapForToday()
    };
  }

  return {
    ...cached,
    canonicalDate,
    currentDuty: duty,
    dutyMap: duty.is_active || resolveDutyWorkDate(duty) === canonicalDate ? cached.dutyMap : emptyMapForToday()
  };
}

function normalizeCachedState(raw: string | null, userId: number): CachedDutyState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedDutyState> & { userId?: number };
    if (parsed.userId !== userId) {
      return null;
    }
    return {
      schemaVersion: 2,
      userId,
      canonicalDate: typeof parsed.canonicalDate === "string" ? parsed.canonicalDate : null,
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

async function migrateLegacySecureStore(userId: number): Promise<CachedDutyState | null> {
  try {
    const raw = await SecureStore.getItemAsync(legacySecureKey(userId));
    if (!raw) return null;
    const byteLength = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(raw).length : raw.length;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[Storage] migrating oversized SecureStore duty cache key=${legacySecureKey(userId)} bytes=${byteLength}`);
    }
    const normalized = normalizeCachedState(raw, userId);
    await SecureStore.deleteItemAsync(legacySecureKey(userId)).catch(() => undefined);
    if (normalized) {
      await AsyncStorage.setItem(cacheKeyForUser(userId), JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    await SecureStore.deleteItemAsync(legacySecureKey(userId)).catch(() => undefined);
    return null;
  }
}

export async function readCachedDutyState(userId: number | null | undefined): Promise<CachedDutyState | null> {
  if (userId == null || !Number.isFinite(userId) || userId <= 0) {
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(cacheKeyForUser(userId));
    const fromAsync = normalizeCachedState(raw, userId);
    if (fromAsync) return fromAsync;
    return migrateLegacySecureStore(userId);
  } catch {
    return migrateLegacySecureStore(userId);
  }
}

export async function writeCachedDutyBootstrap(
  userId: number,
  bootstrap: Pick<MobileBootstrap, "currentDuty" | "dutyMap" | "serverTimeOffsetMs" | "serverNow"> & {
    canonicalDate?: string | null;
  }
): Promise<void> {
  const canonicalDate =
    bootstrap.canonicalDate ??
    getCanonicalWorkDateFromServerNow(bootstrap.serverNow, bootstrap.serverTimeOffsetMs);
  const duty = reconcileDutyForCanonicalDay(bootstrap.currentDuty, canonicalDate);
  const payload: CachedDutyState = {
    schemaVersion: 2,
    userId,
    canonicalDate,
    currentDuty: duty,
    dutyMap: duty ? bootstrap.dutyMap : emptyMapForToday(),
    serverTimeOffsetMs: bootstrap.serverTimeOffsetMs,
    lastSyncedAt: new Date().toISOString(),
    cachedAt: new Date().toISOString()
  };
  const serialized = JSON.stringify(payload);
  await AsyncStorage.setItem(cacheKeyForUser(userId), serialized);
  await SecureStore.deleteItemAsync(legacySecureKey(userId)).catch(() => undefined);
}

export async function clearCachedDutyState(userId: number | null | undefined): Promise<void> {
  if (userId == null || !Number.isFinite(userId) || userId <= 0) {
    return;
  }
  await AsyncStorage.removeItem(cacheKeyForUser(userId)).catch(() => undefined);
  await SecureStore.deleteItemAsync(legacySecureKey(userId)).catch(() => undefined);
}

export function toOfflineDutySnapshot(cached: CachedDutyState): DutyStateSnapshot {
  const canonicalDate =
    cached.canonicalDate ??
    getCanonicalWorkDateFromServerNow(null, cached.serverTimeOffsetMs);
  const sanitized = sanitizeCachedDutyForToday(cached, canonicalDate) ?? {
    ...cached,
    canonicalDate,
    currentDuty: null,
    dutyMap: emptyMapForToday()
  };
  return {
    hydrationStatus: "ready",
    currentDuty: sanitized.currentDuty,
    dutyMap: sanitized.dutyMap,
    serverTimeOffsetMs: sanitized.serverTimeOffsetMs,
    isOffline: true,
    lastSyncedAt: sanitized.lastSyncedAt ?? sanitized.cachedAt,
    syncStatus: "offline",
    bootstrapError: null
  };
}

export { emptyMapForToday };
